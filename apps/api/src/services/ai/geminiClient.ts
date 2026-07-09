import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not set in environment variables.');
}

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Use plain objects — the Type enum is only available in newer SDK versions
// @google/generative-ai v0.14.x expects plain JSON Schema-style objects with uppercase type strings

/**
 * Stage 1 Schema: Column headers mapping
 */
export const mappingResponseSchema = {
  type: "OBJECT",
  description: "Response containing inferred mapping from CSV columns to CRM fields.",
  properties: {
    mapping: {
      type: "ARRAY",
      description: "Array of mapped columns",
      items: {
        type: "OBJECT",
        properties: {
          sourceColumn: {
            type: "STRING",
            description: "The header name of the column in the source CSV file",
          },
          targetField: {
            type: "STRING",
            description: "The target CRM field name it maps to, or 'unmapped' if it does not fit any field.",
            enum: [
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
            ],
          },
          confidence: {
            type: "NUMBER",
            description: "A confidence score between 0 and 1 representing the certainty of this mapping",
          },
          notes: {
            type: "STRING",
            description: "Short notes/rationale explaining the choice, especially if non-obvious",
          },
        },
        required: ["sourceColumn", "targetField", "confidence"],
      },
    },
    unmappedColumns: {
      type: "ARRAY",
      description: "List of source columns that could not be mapped to any CRM field",
      items: {
        type: "STRING",
      },
    },
  },
  required: ["mapping", "unmappedColumns"],
};

/**
 * Stage 2 Schema: Extracted CRM records and skipped records
 */
export const extractionResponseSchema = {
  type: "OBJECT",
  description: "Response containing parsed, structured CRM records and skipped records from a batch",
  properties: {
    records: {
      type: "ARRAY",
      description: "Successfully extracted and normalized CRM records in this batch",
      items: {
        type: "OBJECT",
        properties: {
          created_at: { type: "STRING", description: "ISO timestamp or JS-parseable date string" },
          name: { type: "STRING" },
          email: { type: "STRING" },
          country_code: { type: "STRING" },
          mobile_without_country_code: { type: "STRING" },
          company: { type: "STRING" },
          city: { type: "STRING" },
          state: { type: "STRING" },
          country: { type: "STRING" },
          lead_owner: { type: "STRING" },
          crm_status: {
            type: "STRING",
            description: "MUST be one of the allowed enum values. Omit if unknown or not applicable.",
            enum: ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE"]
          },
          crm_note: { type: "STRING" },
          data_source: {
            type: "STRING",
            description: "MUST be one of the allowed enum values. Omit if unknown or not applicable.",
            enum: ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"]
          },
          possession_time: { type: "STRING" },
          description: { type: "STRING" }
        },
        required: [
          "created_at", "name", "email", "country_code", "mobile_without_country_code",
          "company", "city", "state", "country", "lead_owner",
          "crm_note", "possession_time", "description"
        ]
      }
    },
    skipped: {
      type: "ARRAY",
      description: "Records skipped due to missing email AND mobile numbers",
      items: {
        type: "OBJECT",
        properties: {
          row_index: { type: "INTEGER" },
          raw: { type: "OBJECT" },
          reason: { type: "STRING" }
        },
        required: ["row_index", "raw", "reason"]
      }
    }
  },
  required: ["records", "skipped"]
};

/**
 * Returns a configured Gemini model instance with a given response schema.
 */
export const getGeminiModel = (responseSchema?: object) => {
  if (!genAI) {
    throw new Error('Gemini API is not initialized. Please verify GEMINI_API_KEY.');
  }
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema as any,
      temperature: 0.1,
    },
  });
};
