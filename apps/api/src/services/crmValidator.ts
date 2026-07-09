import { CrmRecord, SkippedRecord, CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from '@groweasy/shared-types';

export interface ValidatedRecord {
  row_index: number;
  data: CrmRecord;
}

export interface ValidationOutput {
  records: ValidatedRecord[];
  skipped: SkippedRecord[];
}

/**
 * Validates and normalizes CRM records at runtime.
 * Correctly aligns extracted records with their source CSV row indices.
 */
export const validateAndCleanRecords = (
  extractedRecords: any[],
  extractedSkipped: any[],
  rawBatchRows: Record<string, string>[],
  batchStartIndex: number
): ValidationOutput => {
  const cleanRecords: ValidatedRecord[] = [];
  
  // 1. Identify which indices were skipped by the AI
  const skippedIndices = new Set<number>();
  extractedSkipped.forEach((item) => {
    if (typeof item.row_index === 'number') {
      skippedIndices.add(item.row_index);
    }
  });

  // 2. Map successful records to the remaining indices in order
  const successfulIndices: number[] = [];
  for (let i = 0; i < rawBatchRows.length; i++) {
    if (!skippedIndices.has(i)) {
      successfulIndices.push(i);
    }
  }

  // Map skipped records
  const cleanSkipped: SkippedRecord[] = [...extractedSkipped].map((item) => ({
    row_index: batchStartIndex + (typeof item.row_index === 'number' ? item.row_index : 0),
    raw: item.raw || {},
    reason: item.reason || 'Skipped during AI parsing',
  }));

  extractedRecords.forEach((record, index) => {
    // Determine the raw row index corresponding to this record
    const relativeIndex = successfulIndices[index] !== undefined ? successfulIndices[index] : index;
    const absoluteIndex = batchStartIndex + relativeIndex;

    const email = (record.email || '').trim();
    const mobile = (record.mobile_without_country_code || '').trim();

    // Re-check requirement: must have email OR mobile number
    if (!email && !mobile) {
      const raw = rawBatchRows[relativeIndex] || {};
      cleanSkipped.push({
        row_index: absoluteIndex,
        raw,
        reason: 'Post-AI validation: Record contains neither email nor mobile number',
      });
      return;
    }

    // Normalize and validate created_at
    let createdAt = record.created_at;
    if (!createdAt || isNaN(Date.parse(createdAt))) {
      createdAt = new Date().toISOString();
    } else {
      createdAt = new Date(createdAt).toISOString();
    }

    // Strict Enum re-checking for crm_status
    let status = record.crm_status || '';
    if (status && !CRM_STATUS_VALUES.includes(status)) {
      console.warn(`Post-AI Validation: Invalid crm_status "${status}" nulled out.`);
      status = '';
    }

    // Strict Enum re-checking for data_source
    let source = record.data_source || '';
    if (source && !DATA_SOURCE_VALUES.includes(source)) {
      console.warn(`Post-AI Validation: Invalid data_source "${source}" nulled out.`);
      source = '';
    }

    cleanRecords.push({
      row_index: absoluteIndex,
      data: {
        created_at: createdAt,
        name: (record.name || '').trim(),
        email,
        country_code: (record.country_code || '').trim().replace(/\+/g, ''),
        mobile_without_country_code: mobile.replace(/\s+/g, ''),
        company: (record.company || '').trim(),
        city: (record.city || '').trim(),
        state: (record.state || '').trim(),
        country: (record.country || '').trim(),
        lead_owner: (record.lead_owner || '').trim(),
        crm_status: status,
        crm_note: (record.crm_note || '').trim(),
        data_source: source,
        possession_time: (record.possession_time || '').trim(),
        description: (record.description || '').trim(),
      },
    });
  });

  return {
    records: cleanRecords,
    skipped: cleanSkipped,
  };
};
