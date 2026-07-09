/**
 * Formats the prompt for Stage 1 (column mapping inference).
 */
export const getMappingPrompt = (headers: string[], sampleRows: Record<string, string>[]): string => {
  return `You are mapping columns from an arbitrary CRM lead export CSV onto a fixed schema.

Target schema fields: created_at, name, email, country_code, mobile_without_country_code, company, city, state, country, lead_owner, crm_status, crm_note, data_source, possession_time, description.

Source CSV headers: ${JSON.stringify(headers)}
Sample rows (for context only, do not extract data yet):
${JSON.stringify(sampleRows, null, 2)}

For each source header, decide which target field it maps to (or "unmapped" if none fit).
Include a confidence score 0-1 and brief notes for any non-obvious mapping (e.g. detected country code prefix pattern, detected multi-value cell, ambiguous column name).

Respond with JSON matching this exact shape:
{ "mapping": [{ "sourceColumn": string, "targetField": string, "confidence": number, "notes": string }],
  "unmappedColumns": string[] }`;
};
