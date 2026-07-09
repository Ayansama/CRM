import { z } from 'zod';
import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from '@groweasy/shared-types';

export const ColumnMappingSchema = z.object({
  sourceColumn: z.string(),
  targetField: z.enum([
    'created_at',
    'name',
    'email',
    'country_code',
    'mobile_without_country_code',
    'company',
    'city',
    'state',
    'country',
    'lead_owner',
    'crm_status',
    'crm_note',
    'data_source',
    'possession_time',
    'description',
    'unmapped'
  ]),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional()
});

export const MappingResultSchema = z.object({
  mapping: z.array(ColumnMappingSchema),
  unmappedColumns: z.array(z.string())
});

export const CrmRecordSchema = z.object({
  created_at: z.string(),
  name: z.string().default(''),
  email: z.string().default(''),
  country_code: z.string().default(''),
  mobile_without_country_code: z.string().default(''),
  company: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  country: z.string().default(''),
  lead_owner: z.string().default(''),
  crm_status: z.enum([...CRM_STATUS_VALUES, '']).default(''),
  crm_note: z.string().default(''),
  data_source: z.enum([...DATA_SOURCE_VALUES, '']).default(''),
  possession_time: z.string().default(''),
  description: z.string().default('')
});

export const SkippedRecordSchema = z.object({
  row_index: z.number(),
  raw: z.record(z.string()),
  reason: z.string()
});

export const ExtractionResultSchema = z.object({
  records: z.array(CrmRecordSchema),
  skipped: z.array(SkippedRecordSchema)
});
