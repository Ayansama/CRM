import { parse } from 'csv-parse';

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses a CSV string or buffer into headers and structured row objects.
 */
export const parseCsv = (csvContent: string | Buffer): Promise<ParsedCsv> => {
  return new Promise((resolve, reject) => {
    parse(
      csvContent,
      {
        bom: true,           // Strip UTF-8 BOM (present in Excel-exported CSVs)
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,  // Don't throw on improperly quoted fields
        relax_column_count: true, // Don't throw if rows have uneven column counts
      },
      (err, records: string[][]) => {
        if (err) {
          return reject(err);
        }

        if (!records || records.length === 0) {
          return resolve({ headers: [], rows: [] });
        }

        // Clean headers by trimming
        const headers = records[0].map((h) => h.trim());
        const rows: Record<string, string>[] = [];

        for (let i = 1; i < records.length; i++) {
          const row = records[i];
          const rowObj: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            // Map row indices to corresponding header key; fallback to empty string if undefined
            rowObj[header] = row[index] !== undefined ? row[index].trim() : '';
          });
          
          rows.push(rowObj);
        }

        return resolve({ headers, rows });
      }
    );
  });
};

/**
 * Splits an array into chunks of a specified size.
 */
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};
