import { ColumnMapping } from '@groweasy/shared-types';

export const getExtractionPrompt = (
  mapping: ColumnMapping[],
  rawRows: Record<string, string>[],
  batchStartIndex: number = 0
): string => {
  const schemaDescription = `
Target CRM Schema Fields:
- created_at: Date string (must be parseable by JS \`new Date(...)\`)
- name: Contact person name
- email: Single primary email address
- country_code: Numeric phone country code (without leading + or 00)
- mobile_without_country_code: Mobile number without country code or spaces
- company: Company name
- city: City name
- state: State name
- country: Country name
- lead_owner: Lead owner
- crm_status: MUST BE ONE OF: "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE", or "" (empty string)
- crm_note: General notes. If there are extra/secondary emails or phone numbers, append them here.
- data_source: MUST BE ONE OF: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots", or "" (empty string)
- possession_time: Preferred possession time
- description: Additional details/comments
`;

  const mappingRules = `
Extraction and Normalization Rules:
1. **Apply Column Mapping:** Use the provided Column Mapping to map source columns to target fields. If a source column is mapped to "unmapped", ignore it for that field.
2. **Date Normalization:** Ensure \`created_at\` is formatted as a valid ISO-8601 string or date format that JS \`new Date(val)\` parses correctly. Fallback to current date if missing or completely unparseable.
3. **Enum Re-checking:** 
   - \`crm_status\` ONLY supports: "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE". If raw value is ambiguous (e.g. "follow up", "warm lead" -> "GOOD_LEAD_FOLLOW_UP"; "bad number", "disconnected" -> "DID_NOT_CONNECT"; "sold" -> "SALE_DONE"), map it to the closest enum. If it doesn't match any, set as "".
   - \`data_source\` ONLY supports: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots". If raw value is ambiguous, map it to the closest matching snake_case enum, or set as "" if none fit.
4. **Multiple Emails/Phones:**
   - If multiple emails are found in the mapped email column (separated by commas/semicolons), put the FIRST one in \`email\` and append the rest to \`crm_note\` (e.g., "Additional emails: second@mail.com").
   - If multiple phone numbers are found (separated by commas/semicolons), put the FIRST one in \`mobile_without_country_code\` and append the rest to \`crm_note\` (e.g., "Additional phones: +12345").
5. **Skipped Rows Logic:**
   - If a row has **neither** a valid email nor a mobile number, it MUST be skipped. Do NOT add it to the \`records\` array. Instead, add it to the \`skipped\` array with a detailed \`reason\` (e.g. "Missing both email and mobile numbers").
   - The \`row_index\` in the skipped array must be the 0-based index of the row relative to this batch (first row is 0, second is 1, etc.).
6. **Embedded Newlines:** Escape any embedded newlines inside cells to maintain flat text in the resulting JSON fields.
`;

  const fewShotExamples = `
---
FEW-SHOT EXAMPLES:

Example 1: Multi-email, Multi-phone, and Ambiguous Status Mapping
- Column Mapping:
[
  {"sourceColumn": "Date", "targetField": "created_at", "confidence": 1.0},
  {"sourceColumn": "Full Name", "targetField": "name", "confidence": 1.0},
  {"sourceColumn": "Contact Info", "targetField": "email", "confidence": 0.9},
  {"sourceColumn": "Phone Numbers", "targetField": "mobile_without_country_code", "confidence": 0.9},
  {"sourceColumn": "Company", "targetField": "company", "confidence": 1.0},
  {"sourceColumn": "Status", "targetField": "crm_status", "confidence": 0.8}
]
- Batch Rows:
[
  {
    "Date": "2024-05-01",
    "Full Name": "Alice Cooper",
    "Contact Info": "alice@gmail.com; alice.work@cooper.com",
    "Phone Numbers": "+1 555-0199, +1 555-0200",
    "Company": "Cooper Corp",
    "Status": "Follow up - good lead"
  }
]
- Output:
{
  "records": [
    {
      "created_at": "2024-05-01T00:00:00.000Z",
      "name": "Alice Cooper",
      "email": "alice@gmail.com",
      "country_code": "1",
      "mobile_without_country_code": "5550199",
      "company": "Cooper Corp",
      "city": "",
      "state": "",
      "country": "",
      "lead_owner": "",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "Additional emails: alice.work@cooper.com. Additional phones: +1 555-0200.",
      "data_source": "",
      "possession_time": "",
      "description": ""
    }
  ],
  "skipped": []
}

Example 2: Row skipping due to lack of Contact Details
- Column Mapping:
[
  {"sourceColumn": "timestamp", "targetField": "created_at", "confidence": 1.0},
  {"sourceColumn": "name", "targetField": "name", "confidence": 1.0},
  {"sourceColumn": "source", "targetField": "data_source", "confidence": 0.9}
]
- Batch Rows:
[
  {
    "timestamp": "2024-06-10 14:30:00",
    "name": "No Info Lead",
    "source": "Eden Park Project"
  }
]
- Output:
{
  "records": [],
  "skipped": [
    {
      "row_index": 0,
      "raw": {
        "timestamp": "2024-06-10 14:30:00",
        "name": "No Info Lead",
        "source": "Eden Park Project"
      },
      "reason": "Missing both email and mobile numbers"
    }
  ]
}

Example 3: Partial Data with Ambiguous Source mapping
- Column Mapping:
[
  {"sourceColumn": "date", "targetField": "created_at", "confidence": 1.0},
  {"sourceColumn": "customer", "targetField": "name", "confidence": 1.0},
  {"sourceColumn": "email_address", "targetField": "email", "confidence": 1.0},
  {"sourceColumn": "source_channel", "targetField": "data_source", "confidence": 0.9}
]
- Batch Rows:
[
  {
    "date": "12/25/2023",
    "customer": "Bob Builder",
    "email_address": "bob@builder.com",
    "source_channel": "meridian tower campaign"
  }
]
- Output:
{
  "records": [
    {
      "created_at": "2023-12-25T00:00:00.000Z",
      "name": "Bob Builder",
      "email": "bob@builder.com",
      "country_code": "",
      "mobile_without_country_code": "",
      "company": "",
      "city": "",
      "state": "",
      "country": "",
      "lead_owner": "",
      "crm_status": "",
      "crm_note": "",
      "data_source": "meridian_tower",
      "possession_time": "",
      "description": ""
    }
  ],
  "skipped": []
}
---
`;

  return `You are extracting CRM records from a batch of raw CSV rows.
${schemaDescription}
${mappingRules}
${fewShotExamples}

Current Column Mapping to apply:
${JSON.stringify(mapping, null, 2)}

Current Batch of Raw Rows (starting at raw row index ${batchStartIndex}):
${JSON.stringify(rawRows, null, 2)}

Process this batch of rows and return a JSON object containing "records" and "skipped" arrays exactly matching the specified Stage 2 extraction schema. Ensure that row_index in the skipped array corresponds to the index of the row inside this batch (from 0 to ${rawRows.length - 1}).`;
};
