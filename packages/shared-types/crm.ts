// crm.ts
export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;
export type CrmStatus = typeof CRM_STATUS_VALUES[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;
export type DataSource = typeof DATA_SOURCE_VALUES[number];

export interface CrmRecord {
  created_at: string;                    // must be parseable by `new Date()`
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  row_index: number;
  raw: Record<string, string>;
  reason: string;                        // e.g. "no email or mobile number found"
}

export interface ImportResult {
  importId: string;
  totalRows: number;
  successCount: number;
  skippedCount: number;
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

// Stage 1 output
export interface ColumnMapping {
  sourceColumn: string;
  targetField: keyof CrmRecord | "unmapped";
  confidence: number;
  notes?: string;
}
export interface MappingResult {
  mapping: ColumnMapping[];
  unmappedColumns: string[];
}

// SSE progress event
export interface ProgressEvent {
  stage: "mapping" | "extracting" | "validating" | "done" | "error";
  batchesDone?: number;
  totalBatches?: number;
  message?: string;
}
