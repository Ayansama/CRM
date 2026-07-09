import { ImportResult, CrmRecord, SkippedRecord } from '@groweasy/shared-types';
import { query, isDbConnected } from '../db/pool';

export interface DbImport {
  id: string;
  filename: string;
  uploaded_at: string;
  total_rows: number;
  success_count: number;
  skipped_count: number;
  status: 'processing' | 'completed' | 'failed';
  header_hash: string;
}

export interface DbImportRecord {
  id: string;
  import_id: string;
  row_index: number;
  status: 'success' | 'skipped';
  skip_reason: string | null;
  data: CrmRecord | Record<string, string>;
}

// In-memory fallbacks for stateless mode
const inMemoryImports = new Map<string, DbImport>();
const inMemoryImportRecords = new Map<string, DbImportRecord[]>();

// Stores raw rows and metadata of imports during processing to enable batch-level retry logic
export interface ActiveImportJob {
  rawRows: Record<string, string>[];
  headers: string[];
  mapping?: any;
  batchStatuses: ('completed' | 'failed')[];
}
export const activeImportJobs = new Map<string, ActiveImportJob>();

export const createImport = async (
  id: string,
  filename: string,
  totalRows: number,
  headerHash: string
): Promise<void> => {
  const now = new Date().toISOString();
  if (isDbConnected()) {
    try {
      await query(
        `INSERT INTO imports (id, filename, uploaded_at, total_rows, success_count, skipped_count, status, header_hash)
         VALUES ($1, $2, $3, $4, 0, 0, 'processing', $5)`,
        [id, filename, now, totalRows, headerHash]
      );
    } catch (error) {
      console.error('Error creating import in DB:', error);
    }
  } else {
    inMemoryImports.set(id, {
      id,
      filename,
      uploaded_at: now,
      total_rows: totalRows,
      success_count: 0,
      skipped_count: 0,
      status: 'processing',
      header_hash: headerHash,
    });
    inMemoryImportRecords.set(id, []);
  }
};

export const updateImportProgress = async (
  id: string,
  successCount: number,
  skippedCount: number,
  status?: 'processing' | 'completed' | 'failed'
): Promise<void> => {
  if (isDbConnected()) {
    try {
      if (status) {
        await query(
          `UPDATE imports 
           SET success_count = $1, skipped_count = $2, status = $3
           WHERE id = $4`,
          [successCount, skippedCount, status, id]
        );
      } else {
        await query(
          `UPDATE imports 
           SET success_count = $1, skipped_count = $2
           WHERE id = $3`,
          [successCount, skippedCount, id]
        );
      }
    } catch (error) {
      console.error('Error updating import progress in DB:', error);
    }
  } else {
    const imp = inMemoryImports.get(id);
    if (imp) {
      imp.success_count = successCount;
      imp.skipped_count = skippedCount;
      if (status) {
        imp.status = status;
      }
      inMemoryImports.set(id, imp);
    }
  }
};

export const addImportRecords = async (
  records: {
    import_id: string;
    row_index: number;
    status: 'success' | 'skipped';
    skip_reason: string | null;
    data: any;
  }[]
): Promise<void> => {
  if (records.length === 0) return;

  if (isDbConnected()) {
    try {
      // Build a multi-row insert query
      const values: any[] = [];
      const placeholders: string[] = [];
      
      records.forEach((rec, idx) => {
        const base = idx * 5;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
        values.push(rec.import_id, rec.row_index, rec.status, rec.skip_reason, JSON.stringify(rec.data));
      });

      const sql = `INSERT INTO import_records (import_id, row_index, status, skip_reason, data) VALUES ${placeholders.join(', ')}`;
      await query(sql, values);
    } catch (error) {
      console.error('Error saving import records in DB:', error);
    }
  } else {
    const importId = records[0].import_id;
    const existing = inMemoryImportRecords.get(importId) || [];
    
    records.forEach((rec) => {
      existing.push({
        id: Math.random().toString(), // dummy ID
        import_id: rec.import_id,
        row_index: rec.row_index,
        status: rec.status,
        skip_reason: rec.skip_reason,
        data: rec.data,
      });
    });

    inMemoryImportRecords.set(importId, existing);
  }
};

export const deleteImportRecords = async (importId: string): Promise<void> => {
  if (isDbConnected()) {
    try {
      await query('DELETE FROM import_records WHERE import_id = $1', [importId]);
    } catch (error) {
      console.error('Error deleting import records in DB:', error);
    }
  } else {
    inMemoryImportRecords.set(importId, []);
  }
};

export const getImport = async (id: string): Promise<DbImport | null> => {
  if (isDbConnected()) {
    try {
      const res = await query('SELECT * FROM imports WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        return res.rows[0] as DbImport;
      }
    } catch (error) {
      console.error('Error fetching import from DB:', error);
    }
  } else {
    return inMemoryImports.get(id) || null;
  }
  return null;
};

export const getImportResult = async (id: string): Promise<ImportResult | null> => {
  const imp = await getImport(id);
  if (!imp) return null;

  let records: DbImportRecord[] = [];
  if (isDbConnected()) {
    try {
      const res = await query('SELECT * FROM import_records WHERE import_id = $1 ORDER BY row_index ASC', [id]);
      records = res.rows as DbImportRecord[];
    } catch (error) {
      console.error('Error fetching import records from DB:', error);
    }
  } else {
    records = inMemoryImportRecords.get(id) || [];
  }

  const successRecords: CrmRecord[] = [];
  const skippedRecords: SkippedRecord[] = [];

  records.forEach((rec) => {
    if (rec.status === 'success') {
      successRecords.push(rec.data as CrmRecord);
    } else {
      skippedRecords.push({
        row_index: rec.row_index,
        raw: rec.data as Record<string, string>,
        reason: rec.skip_reason || 'Skipped',
      });
    }
  });

  return {
    importId: id,
    totalRows: imp.total_rows,
    successCount: imp.success_count,
    skippedCount: imp.skipped_count,
    records: successRecords,
    skipped: skippedRecords,
  };
};

export const getAllImports = async (): Promise<DbImport[]> => {
  if (isDbConnected()) {
    try {
      const res = await query('SELECT * FROM imports ORDER BY uploaded_at DESC');
      return res.rows as DbImport[];
    } catch (error) {
      console.error('Error listing imports from DB:', error);
      return [];
    }
  } else {
    return Array.from(inMemoryImports.values()).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  }
};
