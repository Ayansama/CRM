import { createHash } from 'crypto';
import { MappingResult, ColumnMapping, CrmRecord, SkippedRecord } from '@groweasy/shared-types';
import { getGeminiModel, mappingResponseSchema, extractionResponseSchema } from './geminiClient';
import { generateGroqJson } from './groqClient';
import { getMappingPrompt } from './prompts/mappingPrompt';
import { getExtractionPrompt } from './prompts/extractionPrompt';
import { MappingResultSchema, ExtractionResultSchema } from './validation';
import { query, isDbConnected } from '../../db/pool';
import { validateAndCleanRecords, ValidatedRecord } from '../crmValidator';

// Local in-memory cache fallback for stateless mode
const inMemoryCache = new Map<string, { mapping: MappingResult; hitCount: number }>();

/**
 * Computes SHA256 of alphabetically sorted headers to use as cache key.
 */
export const computeHeaderHash = (headers: string[]): string => {
  const sorted = [...headers].sort();
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
};

/**
 * Retrieves the cached column mapping if it exists.
 */
export const getCachedMapping = async (headerHash: string): Promise<MappingResult | null> => {
  if (isDbConnected()) {
    try {
      const res = await query(
        'SELECT mapping FROM column_mappings WHERE header_hash = $1',
        [headerHash]
      );
      if (res.rows.length > 0) {
        // Increment database hit count
        await query(
          'UPDATE column_mappings SET hit_count = hit_count + 1 WHERE header_hash = $1',
          [headerHash]
        );
        return res.rows[0].mapping as MappingResult;
      }
    } catch (error) {
      console.error('Error fetching cached mapping from PostgreSQL:', error);
    }
  } else {
    const cached = inMemoryCache.get(headerHash);
    if (cached) {
      cached.hitCount += 1;
      return cached.mapping;
    }
  }
  return null;
};

/**
 * Saves a column mapping to the cache.
 */
export const saveCachedMapping = async (headerHash: string, mapping: MappingResult): Promise<void> => {
  if (isDbConnected()) {
    try {
      await query(
        `INSERT INTO column_mappings (header_hash, mapping, hit_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (header_hash) 
         DO UPDATE SET hit_count = column_mappings.hit_count + 1`,
        [headerHash, JSON.stringify(mapping)]
      );
    } catch (error) {
      console.error('Error saving mapping to PostgreSQL:', error);
    }
  } else {
    inMemoryCache.set(headerHash, { mapping, hitCount: 1 });
  }
};

/**
 * Injects a mapping into the in-memory cache. Useful for tests.
 */
export const injectMockCache = (headerHash: string, mapping: MappingResult) => {
  inMemoryCache.set(headerHash, { mapping, hitCount: 1 });
};

/**
 * Clears the in-memory cache. Useful for tests.
 */
export const clearMockCache = () => {
  inMemoryCache.clear();
};

/**
 * Infers column mapping from CSV headers and sample data using Gemini (primary) or Groq (fallback).
 */
export const inferColumnMapping = async (
  headers: string[],
  sampleRows: Record<string, string>[]
): Promise<MappingResult> => {
  const headerHash = computeHeaderHash(headers);
  
  // 1. Cache Check
  const cached = await getCachedMapping(headerHash);
  if (cached) {
    console.log(`Cache hit for header hash: ${headerHash}`);
    return cached;
  }

  console.log(`Cache miss. Inferring schema mapping via AI (Hash: ${headerHash})`);
  const prompt = getMappingPrompt(headers, sampleRows);

  // Helper to run primary model (Gemini)
  const tryGemini = async (): Promise<MappingResult> => {
    const model = getGeminiModel(mappingResponseSchema);
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const rawJson = JSON.parse(text);
    return MappingResultSchema.parse(rawJson) as MappingResult;
  };

  // Helper to run fallback model (Groq)
  const tryGroq = async (): Promise<MappingResult> => {
    console.log('Gemini failed or validation errored. Falling back to Groq Llama 3.3...');
    const text = await generateGroqJson(prompt);
    const rawJson = JSON.parse(text);
    return MappingResultSchema.parse(rawJson) as MappingResult;
  };

  let result: MappingResult;

  // Try Gemini + 1 retry
  try {
    result = await tryGemini();
  } catch (error1) {
    console.warn('Gemini Stage 1 attempt 1 failed:', error1);
    try {
      console.log('Retrying Gemini Stage 1...');
      result = await tryGemini();
    } catch (error2) {
      console.warn('Gemini Stage 1 attempt 2 failed. Using Groq fallback:', error2);
      // Fallback to Groq
      try {
        result = await tryGroq();
      } catch (groqError) {
        console.error('All AI Stage 1 mapping attempts failed:', groqError);
        throw new Error('Failed to infer column mapping using Gemini and Groq fallback.');
      }
    }
  }

  // 2. Cache Write
  await saveCachedMapping(headerHash, result);
  return result;
};

/**
 * Processes a batch of raw CSV rows using the inferred Column Mapping.
 * Performs Gemini extraction, validates with Zod, retries, falls back to Groq,
 * and passes the result through the crmValidator for clean enum/date structures.
 */
export const extractBatch = async (
  mapping: ColumnMapping[],
  rawRows: Record<string, string>[],
  batchStartIndex: number
): Promise<{ records: ValidatedRecord[]; skipped: SkippedRecord[] }> => {
  console.log(`Extracting batch of size ${rawRows.length} starting at index ${batchStartIndex}`);
  const prompt = getExtractionPrompt(mapping, rawRows, batchStartIndex);

  // Helper to run primary model (Gemini)
  const tryGemini = async (): Promise<{ records: any[]; skipped: any[] }> => {
    const model = getGeminiModel(extractionResponseSchema);
    const response = await model.generateContent(prompt);
    const text = response.response.text();
    const rawJson = JSON.parse(text);
    return ExtractionResultSchema.parse(rawJson);
  };

  // Helper to run fallback model (Groq)
  const tryGroq = async (): Promise<{ records: any[]; skipped: any[] }> => {
    console.log('Gemini Stage 2 failed or validation errored. Falling back to Groq Llama 3.3...');
    const text = await generateGroqJson(prompt);
    const rawJson = JSON.parse(text);
    return ExtractionResultSchema.parse(rawJson);
  };

  let rawResult: { records: any[]; skipped: any[] };

  // Try Gemini + 1 retry
  try {
    rawResult = await tryGemini();
  } catch (error1) {
    console.warn(`Gemini Stage 2 attempt 1 failed at index ${batchStartIndex}:`, error1);
    try {
      console.log('Retrying Gemini Stage 2...');
      rawResult = await tryGemini();
    } catch (error2) {
      console.warn(`Gemini Stage 2 attempt 2 failed. Using Groq fallback:`, error2);
      try {
        rawResult = await tryGroq();
      } catch (groqError) {
        console.error('All AI Stage 2 attempts failed:', groqError);
        throw new Error(`Failed to extract batch starting at index ${batchStartIndex} using Gemini and Groq fallback.`);
      }
    }
  }

  // Code-level sanitization, normalization, and filtering
  return validateAndCleanRecords(
    rawResult.records,
    rawResult.skipped,
    rawRows,
    batchStartIndex
  );
};
