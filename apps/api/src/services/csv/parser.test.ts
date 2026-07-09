import { describe, it, expect } from 'vitest';
import { parseCsv, chunkArray } from './parser';

describe('CSV Parser Service', () => {
  it('should parse a standard CSV correctly', async () => {
    const csvContent = `First Name, Last Name, Email, Phone
John, Doe, john@example.com, 123456789
Jane, Smith, jane@example.com, 987654321`;

    const { headers, rows } = await parseCsv(csvContent);

    expect(headers).toEqual(['First Name', 'Last Name', 'Email', 'Phone']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      'First Name': 'John',
      'Last Name': 'Doe',
      'Email': 'john@example.com',
      'Phone': '123456789',
    });
    expect(rows[1]).toEqual({
      'First Name': 'Jane',
      'Last Name': 'Smith',
      'Email': 'jane@example.com',
      'Phone': '987654321',
    });
  });

  it('should handle empty rows and trim values', async () => {
    const csvContent = `  Header1 , Header2  
  val1  ,   val2  
`;
    const { headers, rows } = await parseCsv(csvContent);
    expect(headers).toEqual(['Header1', 'Header2']);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      Header1: 'val1',
      Header2: 'val2',
    });
  });

  it('should chunk an array of rows correctly into batches of 25', () => {
    const rows = Array.from({ length: 60 }, (_, i) => ({ id: `row-${i}` }));
    const batches = chunkArray(rows, 25);

    expect(batches).toHaveLength(3); // 25 + 25 + 10
    expect(batches[0]).toHaveLength(25);
    expect(batches[1]).toHaveLength(25);
    expect(batches[2]).toHaveLength(10);
    expect(batches[0][0].id).toBe('row-0');
    expect(batches[2][9].id).toBe('row-59');
  });
});
