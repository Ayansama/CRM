import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { parseCsv, chunkArray } from '../services/csv/parser';
import { inferColumnMapping, extractBatch, computeHeaderHash } from '../services/ai/extractor';
import {
  createImport,
  updateImportProgress,
  addImportRecords,
  getImport,
  getImportResult,
  getAllImports,
  activeImportJobs,
  getAllLeads,
  getAnalytics,
} from '../services/importStore';
import { sseManager } from '../services/sseManager';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper to run the extraction pipeline in the background.
 */
const runExtractionPipeline = async (
  importId: string,
  headers: string[],
  rawRows: Record<string, string>[]
) => {
  try {
    // 1. Stage 1: mapping inference
    sseManager.broadcast(importId, { stage: 'mapping', message: 'Inferring column mapping...' });
    
    // Pass first 5 rows to LLM as sample rows
    const sampleRows = rawRows.slice(0, 5);
    const mappingResult = await inferColumnMapping(headers, sampleRows);
    
    // Save inferred mapping context to job tracker for retry support
    const job = activeImportJobs.get(importId);
    if (job) {
      job.mapping = mappingResult.mapping;
      activeImportJobs.set(importId, job);
    }

    // 2. Stage 2: chunking & processing
    const batches = chunkArray(rawRows, 25);
    const totalBatches = batches.length;

    if (job) {
      job.batchStatuses = Array(totalBatches).fill('failed'); // Default all to failed until they succeed
      activeImportJobs.set(importId, job);
    }

    sseManager.broadcast(importId, {
      stage: 'extracting',
      batchesDone: 0,
      totalBatches,
      message: `Starting extraction: 0 of ${totalBatches} batches completed.`
    });

    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < totalBatches; i++) {
      const batchRows = batches[i];
      const batchStartIndex = i * 25;

      try {
        const { records: cleanRecords, skipped: cleanSkipped } = await extractBatch(
          mappingResult.mapping,
          batchRows,
          batchStartIndex
        );

        // Prepare records to save in DB/memory
        const recordsToSave = cleanRecords.map((r) => ({
          import_id: importId,
          row_index: r.row_index,
          status: 'success' as const,
          skip_reason: null,
          data: r.data,
        }));

        const skippedToSave = cleanSkipped.map((s) => ({
          import_id: importId,
          row_index: s.row_index,
          status: 'skipped' as const,
          skip_reason: s.reason,
          data: s.raw,
        }));

        await addImportRecords([...recordsToSave, ...skippedToSave]);

        successCount += cleanRecords.length;
        skippedCount += cleanSkipped.length;

        // Update progress counts in store
        await updateImportProgress(importId, successCount, skippedCount, 'processing');

        // Mark batch as completed
        const currentJob = activeImportJobs.get(importId);
        if (currentJob) {
          currentJob.batchStatuses[i] = 'completed';
          activeImportJobs.set(importId, currentJob);
        }

        sseManager.broadcast(importId, {
          stage: 'extracting',
          batchesDone: i + 1,
          totalBatches,
          message: `Extracted batch ${i + 1} of ${totalBatches}.`
        });

      } catch (batchError) {
        console.error(`Error processing batch ${i + 1} for import ${importId}:`, batchError);
        // Mark batch as failed
        const currentJob = activeImportJobs.get(importId);
        if (currentJob) {
          currentJob.batchStatuses[i] = 'failed';
          activeImportJobs.set(importId, currentJob);
        }

        sseManager.broadcast(importId, {
          stage: 'extracting',
          batchesDone: i + 1,
          totalBatches,
          message: `Batch ${i + 1} failed.`
        });
      }
    }

    // Verify if any batches remained in 'failed' status
    const finalJob = activeImportJobs.get(importId);
    const hasFailures = finalJob?.batchStatuses.includes('failed');
    const finalStatus = hasFailures ? 'failed' : 'completed';

    await updateImportProgress(importId, successCount, skippedCount, finalStatus);

    sseManager.broadcast(importId, {
      stage: finalStatus === 'completed' ? 'done' : 'error',
      message: finalStatus === 'completed' 
        ? 'Import completed successfully.' 
        : 'Import finished, but some batches failed.'
    });

  } catch (err: any) {
    console.error(`Critical pipeline error in import ${importId}:`, err);
    await updateImportProgress(importId, 0, 0, 'failed');
    sseManager.broadcast(importId, {
      stage: 'error',
      message: err.message || 'Pipeline failed during execution.'
    });
  }
};

/**
 * POST /api/import/upload
 * Expects a multipart form upload with the CSV file in the "file" field.
 */
router.post('/import/upload', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded.' });
    }

    const filename = req.file.originalname;
    const csvContent = req.file.buffer.toString('utf-8');

    // Clean parse CSV to verify columns and data
    const { headers, rows } = await parseCsv(csvContent);
    if (headers.length === 0) {
      return res.status(400).json({ error: 'Uploaded file has no column headers.' });
    }

    const importId = crypto.randomUUID();
    const headerHash = computeHeaderHash(headers);

    // Save initial placeholder record in DB/memory
    await createImport(importId, filename, rows.length, headerHash);

    // Track active job metadata in memory to support batch retry
    activeImportJobs.set(importId, {
      rawRows: rows,
      headers,
      batchStatuses: []
    });

    // Respond immediately with the newly created importId
    res.status(200).json({ importId });

    // Trigger parsing asynchronously in the background
    runExtractionPipeline(importId, headers, rows);

  } catch (error: any) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process file upload.' });
  }
});

/**
 * GET /api/import/:id/stream
 * Hardened SSE stream channel for broadcasting progress.
 */
router.get('/import/:id/stream', async (req: Request, res: Response): Promise<any> => {
  const importId = req.params.id;

  // Set explicit SSE headers per §9
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send a heartbeat ping comment every 15 seconds to prevent network disconnect timeouts
  const heartbeatInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  // Subscribe this response stream to sseManager progress events
  const unsubscribe = sseManager.subscribe(importId, res);

  // Push initial status immediately if job is already recorded
  const currentImport = await getImport(importId);
  if (currentImport) {
    if (currentImport.status === 'completed') {
      res.write(`event: progress\ndata: ${JSON.stringify({ stage: 'done', message: 'Import already completed.' })}\n\n`);
    } else if (currentImport.status === 'failed') {
      res.write(`event: progress\ndata: ${JSON.stringify({ stage: 'error', message: 'Import failed.' })}\n\n`);
    } else {
      const totalRows = currentImport.total_rows;
      const totalBatches = Math.ceil(totalRows / 25);
      const batchesDone = Math.min(
        totalBatches,
        Math.floor((currentImport.success_count + currentImport.skipped_count) / 25)
      );
      res.write(`event: progress\ndata: ${JSON.stringify({
        stage: 'extracting',
        batchesDone,
        totalBatches,
        message: 'Reconnected to active import.'
      })}\n\n`);
    }
  }

  // Handle client disconnect cleanup
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
    res.end();
  });
});

/**
 * GET /api/import/:id/result
 * Returns the final ImportResult structure.
 */
router.get('/import/:id/result', async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await getImportResult(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Import result not found.' });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve results.' });
  }
});

/**
 * POST /api/import/:id/retry
 * Retries failed batches of an import job.
 */
router.post('/import/:id/retry', async (req: Request, res: Response): Promise<any> => {
  const importId = req.params.id;
  const job = activeImportJobs.get(importId);

  if (!job) {
    return res.status(404).json({ error: 'Active import job not found in memory (it may have expired).' });
  }

  try {
    const currentImport = await getImport(importId);
    if (!currentImport) {
      return res.status(404).json({ error: 'Import details not found.' });
    }

    // Update status to processing to reflect retry trigger
    await updateImportProgress(importId, currentImport.success_count, currentImport.skipped_count, 'processing');

    // Respond immediately, letting retry happen in the background
    res.json({ message: 'Retry triggered successfully.' });

    // Trigger retry pipeline
    (async () => {
      try {
        const rawRows = job.rawRows;
        const mapping = job.mapping;
        const batches = chunkArray(rawRows, 25);
        const totalBatches = batches.length;

        sseManager.broadcast(importId, { stage: 'extracting', message: 'Retrying failed batches...' });

        let successCount = currentImport.success_count;
        let skippedCount = currentImport.skipped_count;

        for (let i = 0; i < totalBatches; i++) {
          if (job.batchStatuses[i] === 'failed') {
            const batchRows = batches[i];
            const batchStartIndex = i * 25;

            try {
              const { records: cleanRecords, skipped: cleanSkipped } = await extractBatch(
                mapping,
                batchRows,
                batchStartIndex
              );

              // Prepare clean records to save
              const recordsToSave = cleanRecords.map((r) => ({
                import_id: importId,
                row_index: r.row_index,
                status: 'success' as const,
                skip_reason: null,
                data: r.data,
              }));

              const skippedToSave = cleanSkipped.map((s) => ({
                import_id: importId,
                row_index: s.row_index,
                status: 'skipped' as const,
                skip_reason: s.reason,
                data: s.raw,
              }));

              await addImportRecords([...recordsToSave, ...skippedToSave]);

              successCount += cleanRecords.length;
              skippedCount += cleanSkipped.length;

              // Update running counts
              await updateImportProgress(importId, successCount, skippedCount, 'processing');

              // Mark this batch as completed now
              job.batchStatuses[i] = 'completed';
              activeImportJobs.set(importId, job);

            } catch (err) {
              console.error(`Retry failed for batch ${i + 1} of import ${importId}:`, err);
            }
          }
        }

        const hasFailures = job.batchStatuses.includes('failed');
        const finalStatus = hasFailures ? 'failed' : 'completed';
        
        await updateImportProgress(importId, successCount, skippedCount, finalStatus);

        sseManager.broadcast(importId, {
          stage: finalStatus === 'completed' ? 'done' : 'error',
          message: finalStatus === 'completed' 
            ? 'Retry completed successfully.' 
            : 'Retry finished, but some batches still failed.'
        });

      } catch (err) {
        console.error(`Retry pipeline crashed for import ${importId}:`, err);
        sseManager.broadcast(importId, { stage: 'error', message: 'Retry pipeline crashed.' });
      }
    })();

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initialize retry pipeline.' });
  }
});

/**
 * GET /api/imports
 * Returns a list of all historical imports.
 */
router.get('/imports', async (req: Request, res: Response) => {
  try {
    const list = await getAllImports();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list imports.' });
  }
});

/**
 * GET /api/leads
 * Returns paginated and optionally filtered leads from all imports, newest first.
 */
router.get('/leads', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const search = req.query.search as string | undefined;

    const result = await getAllLeads(page, limit, search);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve leads.' });
  }
});

/**
 * GET /api/analytics
 * Returns aggregated statistics for the dashboard.
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to compute analytics.' });
  }
});

export default router;
