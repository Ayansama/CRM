import { describe, it, expect } from 'vitest';
import { validateAndCleanRecords } from './crmValidator';

describe('CRM Validator Service', () => {
  it('should clean and normalize standard CRM records', () => {
    const extractedRecords = [
      {
        created_at: '2024-05-01',
        name: '  John Doe  ',
        email: 'john@doe.com',
        country_code: '+1',
        mobile_without_country_code: ' 555-1234 ',
        company: 'Doe Inc',
        crm_status: 'GOOD_LEAD_FOLLOW_UP',
        data_source: 'leads_on_demand'
      }
    ];

    const { records, skipped } = validateAndCleanRecords(extractedRecords, [], [], 0);

    expect(skipped).toHaveLength(0);
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({
      created_at: new Date('2024-05-01').toISOString(),
      name: 'John Doe',
      email: 'john@doe.com',
      country_code: '1',
      mobile_without_country_code: '555-1234',
      company: 'Doe Inc',
      city: '',
      state: '',
      country: '',
      lead_owner: '',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      crm_note: '',
      data_source: 'leads_on_demand',
      possession_time: '',
      description: ''
    });
  });

  it('should null out invalid enum values', () => {
    const extractedRecords = [
      {
        created_at: '2024-05-01',
        name: 'Alice',
        email: 'alice@test.com',
        crm_status: 'INVALID_STATUS',
        data_source: 'INVALID_SOURCE'
      }
    ];

    const { records } = validateAndCleanRecords(extractedRecords, [], [], 0);

    expect(records[0].crm_status).toBe('');
    expect(records[0].data_source).toBe('');
  });

  it('should fallback to current time if created_at is unparseable', () => {
    const extractedRecords = [
      {
        created_at: 'unparseable-date-string',
        name: 'Alice',
        email: 'alice@test.com'
      }
    ];

    const { records } = validateAndCleanRecords(extractedRecords, [], [], 0);
    
    expect(records[0].created_at).toBeDefined();
    expect(isNaN(Date.parse(records[0].created_at))).toBe(false);
  });

  it('should skip rows with neither email nor mobile and track absolute index', () => {
    const extractedRecords = [
      {
        created_at: '2024-05-01',
        name: 'No Contact Person'
      }
    ];
    const rawRows = [
      {
        'raw_date': '2024-05-01',
        'raw_name': 'No Contact Person'
      }
    ];

    const { records, skipped } = validateAndCleanRecords(extractedRecords, [], rawRows, 50);

    expect(records).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toEqual({
      row_index: 50,
      raw: {
        'raw_date': '2024-05-01',
        'raw_name': 'No Contact Person'
      },
      reason: 'Post-AI validation: Record contains neither email nor mobile number'
    });
  });
});
