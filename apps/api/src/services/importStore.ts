import { ImportResult, CrmRecord, SkippedRecord } from '@groweasy/shared-types';
import { query, isDbConnected } from '../db/pool';

export interface DbImport {
  id: string;
  filename: string;
  uploaded_at: string;
  total_rows: number;
  success_count: number;
  skipped_count: number;
  status: 'processing' | 'completed' | 'failed';
  header_hash: string;
}

export interface DbImportRecord {
  id: string;
  import_id: string;
  row_index: number;
  status: 'success' | 'skipped';
  skip_reason: string | null;
  data: CrmRecord | Record<string, string>;
}

// In-memory fallbacks for stateless mode
const inMemoryImports = new Map<string, DbImport>();
const inMemoryImportRecords = new Map<string, DbImportRecord[]>();

// Stores raw rows and metadata of imports during processing to enable batch-level retry logic
export interface ActiveImportJob {
  rawRows: Record<string, string>[];
  headers: string[];
  mapping?: any;
  batchStatuses: ('completed' | 'failed')[];
}
export const activeImportJobs = new Map<string, ActiveImportJob>();

export const createImport = async (
  id: string,
  filename: string,
  totalRows: number,
  headerHash: string
): Promise<void> => {
  const now = new Date().toISOString();
  if (isDbConnected()) {
    try {
      await query(
        `INSERT INTO imports (id, filename, uploaded_at, total_rows, success_count, skipped_count, status, header_hash)
         VALUES ($1, $2, $3, $4, 0, 0, 'processing', $5)`,
        [id, filename, now, totalRows, headerHash]
      );
    } catch (error) {
      console.error('Error creating import in DB:', error);
    }
  } else {
    inMemoryImports.set(id, {
      id,
      filename,
      uploaded_at: now,
      total_rows: totalRows,
      success_count: 0,
      skipped_count: 0,
      status: 'processing',
      header_hash: headerHash,
    });
    inMemoryImportRecords.set(id, []);
  }
};

export const updateImportProgress = async (
  id: string,
  successCount: number,
  skippedCount: number,
  status?: 'processing' | 'completed' | 'failed'
): Promise<void> => {
  if (isDbConnected()) {
    try {
      if (status) {
        await query(
          `UPDATE imports 
           SET success_count = $1, skipped_count = $2, status = $3
           WHERE id = $4`,
          [successCount, skippedCount, status, id]
        );
      } else {
        await query(
          `UPDATE imports 
           SET success_count = $1, skipped_count = $2
           WHERE id = $3`,
          [successCount, skippedCount, id]
        );
      }
    } catch (error) {
      console.error('Error updating import progress in DB:', error);
    }
  } else {
    const imp = inMemoryImports.get(id);
    if (imp) {
      imp.success_count = successCount;
      imp.skipped_count = skippedCount;
      if (status) {
        imp.status = status;
      }
      inMemoryImports.set(id, imp);
    }
  }
};

export const addImportRecords = async (
  records: {
    import_id: string;
    row_index: number;
    status: 'success' | 'skipped';
    skip_reason: string | null;
    data: any;
  }[]
): Promise<void> => {
  if (records.length === 0) return;

  if (isDbConnected()) {
    try {
      // Build a multi-row insert query
      const values: any[] = [];
      const placeholders: string[] = [];
      
      records.forEach((rec, idx) => {
        const base = idx * 5;
        placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
        values.push(rec.import_id, rec.row_index, rec.status, rec.skip_reason, JSON.stringify(rec.data));
      });

      const sql = `INSERT INTO import_records (import_id, row_index, status, skip_reason, data) VALUES ${placeholders.join(', ')}`;
      await query(sql, values);
    } catch (error) {
      console.error('Error saving import records in DB:', error);
    }
  } else {
    const importId = records[0].import_id;
    const existing = inMemoryImportRecords.get(importId) || [];
    
    records.forEach((rec) => {
      existing.push({
        id: Math.random().toString(), // dummy ID
        import_id: rec.import_id,
        row_index: rec.row_index,
        status: rec.status,
        skip_reason: rec.skip_reason,
        data: rec.data,
      });
    });

    inMemoryImportRecords.set(importId, existing);
  }
};

export const deleteImportRecords = async (importId: string): Promise<void> => {
  if (isDbConnected()) {
    try {
      await query('DELETE FROM import_records WHERE import_id = $1', [importId]);
    } catch (error) {
      console.error('Error deleting import records in DB:', error);
    }
  } else {
    inMemoryImportRecords.set(importId, []);
  }
};

export const getImport = async (id: string): Promise<DbImport | null> => {
  if (isDbConnected()) {
    try {
      const res = await query('SELECT * FROM imports WHERE id = $1', [id]);
      if (res.rows.length > 0) {
        return res.rows[0] as DbImport;
      }
    } catch (error) {
      console.error('Error fetching import from DB:', error);
    }
  } else {
    return inMemoryImports.get(id) || null;
  }
  return null;
};

export const getImportResult = async (id: string): Promise<ImportResult | null> => {
  const imp = await getImport(id);
  if (!imp) return null;

  let records: DbImportRecord[] = [];
  if (isDbConnected()) {
    try {
      const res = await query('SELECT * FROM import_records WHERE import_id = $1 ORDER BY row_index ASC', [id]);
      records = res.rows as DbImportRecord[];
    } catch (error) {
      console.error('Error fetching import records from DB:', error);
    }
  } else {
    records = inMemoryImportRecords.get(id) || [];
  }

  const successRecords: CrmRecord[] = [];
  const skippedRecords: SkippedRecord[] = [];

  records.forEach((rec) => {
    if (rec.status === 'success') {
      successRecords.push(rec.data as CrmRecord);
    } else {
      skippedRecords.push({
        row_index: rec.row_index,
        raw: rec.data as Record<string, string>,
        reason: rec.skip_reason || 'Skipped',
      });
    }
  });

  return {
    importId: id,
    totalRows: imp.total_rows,
    successCount: imp.success_count,
    skippedCount: imp.skipped_count,
    records: successRecords,
    skipped: skippedRecords,
  };
};

export const getAllImports = async (): Promise<DbImport[]> => {
  if (isDbConnected()) {
    try {
      const res = await query('SELECT * FROM imports ORDER BY uploaded_at DESC');
      return res.rows as DbImport[];
    } catch (error) {
      console.error('Error listing imports from DB:', error);
      return [];
    }
  } else {
    return Array.from(inMemoryImports.values()).sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  }
};

export const getAllLeads = async (
  page: number,
  limit: number,
  search?: string
): Promise<{ total: number; leads: CrmRecord[] }> => {
  const offset = (page - 1) * limit;

  if (isDbConnected()) {
    try {
      let sql = `
        SELECT COUNT(*) OVER() as total_count, data
        FROM import_records
        WHERE status = 'success'
      `;
      const params: any[] = [limit, offset];

      if (search) {
        sql += ` AND ( (data->>'email') ILIKE $3 OR (data->>'mobile_without_country_code') LIKE $3 )`;
        params.push(`%${search}%`);
      }

      sql += ` ORDER BY (data->>'created_at') DESC LIMIT $1 OFFSET $2`;

      const res = await query(sql, params);
      const total = res.rows.length > 0 ? parseInt(res.rows[0].total_count, 10) : 0;
      const leads = res.rows.map((r) => r.data as CrmRecord);
      return { total, leads };
    } catch (error) {
      console.error('Error fetching leads from DB:', error);
      return { total: 0, leads: [] };
    }
  } else {
    const allRecords: CrmRecord[] = [];
    for (const [, records] of inMemoryImportRecords) {
      for (const r of records) {
        if (r.status === 'success') {
          allRecords.push(r.data as CrmRecord);
        }
      }
    }

    let filtered = allRecords;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = allRecords.filter((r) => {
        const emailMatch = r.email && r.email.toLowerCase().includes(searchLower);
        const phoneMatch = r.mobile_without_country_code && r.mobile_without_country_code.includes(search);
        return emailMatch || phoneMatch;
      });
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const sliced = filtered.slice(offset, offset + limit);
    return {
      total: filtered.length,
      leads: sliced,
    };
  }
};

export const getAnalytics = async (): Promise<any> => {
  let allLeads: CrmRecord[] = [];

  if (isDbConnected()) {
    try {
      const res = await query("SELECT data FROM import_records WHERE status = 'success'");
      allLeads = res.rows.map((r) => r.data as CrmRecord);
    } catch (error) {
      console.error('Error fetching all leads for analytics from DB:', error);
    }
  } else {
    for (const [, records] of inMemoryImportRecords) {
      for (const r of records) {
        if (r.status === 'success') {
          allLeads.push(r.data as CrmRecord);
        }
      }
    }
  }

  const totals = {
    leads: allLeads.length,
    salesDone: 0,
    conversionRate: 0,
  };

  const byStatus = {
    GOOD_LEAD_FOLLOW_UP: 0,
    DID_NOT_CONNECT: 0,
    BAD_LEAD: 0,
    SALE_DONE: 0,
    uncontacted: 0,
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayStats = {
    total: 0,
    contacted: 0,
    goodLeads: 0,
    badLeads: 0,
    didntConnect: 0,
    saleDone: 0,
  };

  // Build last-7-days daily trend (day 0 = 6 days ago, day 6 = today)
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // Label each bucket with a short weekday label and ISO date string
  const activityTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue …
    const dateStr = d.toISOString().slice(0, 10);                       // YYYY-MM-DD
    return { day: i, label, dateStr, totalLeads: 0, contacted: 0, goodLead: 0, badLead: 0, didntConnect: 0, saleDone: 0 };
  });

  allLeads.forEach((r) => {
    if (r.crm_status === 'SALE_DONE') {
      totals.salesDone++;
    }

    if (!r.crm_status) {
      byStatus.uncontacted++;
    } else if (r.crm_status in byStatus) {
      byStatus[r.crm_status as keyof typeof byStatus]++;
    }

    const d = new Date(r.created_at);
    if (!isNaN(d.getTime())) {
      if (d >= todayStart && d <= todayEnd) {
        todayStats.total++;
        if (r.crm_status) {
          todayStats.contacted++;
          if (r.crm_status === 'GOOD_LEAD_FOLLOW_UP') todayStats.goodLeads++;
          else if (r.crm_status === 'BAD_LEAD') todayStats.badLeads++;
          else if (r.crm_status === 'DID_NOT_CONNECT') todayStats.didntConnect++;
          else if (r.crm_status === 'SALE_DONE') todayStats.saleDone++;
        }
      }

      // Map into the 7-day trend
      const dateStr = d.toISOString().slice(0, 10);
      const bucket = activityTrend.find((b) => b.dateStr === dateStr);
      if (bucket) {
        bucket.totalLeads++;
        if (r.crm_status) {
          bucket.contacted++;
          if (r.crm_status === 'GOOD_LEAD_FOLLOW_UP') bucket.goodLead++;
          else if (r.crm_status === 'BAD_LEAD') bucket.badLead++;
          else if (r.crm_status === 'DID_NOT_CONNECT') bucket.didntConnect++;
          else if (r.crm_status === 'SALE_DONE') bucket.saleDone++;
        }
      }
    }
  });

  totals.conversionRate = totals.leads > 0 ? parseFloat(((totals.salesDone / totals.leads) * 100).toFixed(1)) : 0;

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  let thisMonthLeads = 0;
  let lastMonthLeads = 0;

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const thisMonday = getMonday(now);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const lastSundayEnd = new Date(thisMonday);
  lastSundayEnd.setMilliseconds(-1);

  let thisWeekSales = 0;
  let lastWeekSales = 0;

  let thisMonthSales = 0;
  let lastMonthSales = 0;

  allLeads.forEach((r) => {
    const d = new Date(r.created_at);
    if (!isNaN(d.getTime())) {
      if (d >= startOfThisMonth) {
        thisMonthLeads++;
        if (r.crm_status === 'SALE_DONE') {
          thisMonthSales++;
        }
      } else if (d >= startOfLastMonth && d <= endOfLastMonth) {
        lastMonthLeads++;
        if (r.crm_status === 'SALE_DONE') {
          lastMonthSales++;
        }
      }

      if (d >= thisMonday) {
        if (r.crm_status === 'SALE_DONE') {
          thisWeekSales++;
        }
      } else if (d >= lastMonday && d <= lastSundayEnd) {
        if (r.crm_status === 'SALE_DONE') {
          lastWeekSales++;
        }
      }
    }
  });

  let leadsVsLastMonth: number | null = null;
  if (lastMonthLeads > 0) {
    leadsVsLastMonth = parseFloat((((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100).toFixed(1));
  }

  let salesVsLastWeek: number | null = null;
  if (lastWeekSales > 0) {
    salesVsLastWeek = parseFloat((((thisWeekSales - lastWeekSales) / lastWeekSales) * 100).toFixed(1));
  }

  let conversionDelta: number | null = null;
  const thisMonthConversion = thisMonthLeads > 0 ? (thisMonthSales / thisMonthLeads) * 100 : 0;
  const lastMonthConversion = lastMonthLeads > 0 ? (lastMonthSales / lastMonthLeads) * 100 : 0;
  if (thisMonthLeads > 0 && lastMonthLeads > 0) {
    conversionDelta = parseFloat((thisMonthConversion - lastMonthConversion).toFixed(1));
  }

  return {
    totals,
    byStatus,
    today: todayStats,
    activityTrend,
    delta: {
      leadsVsLastMonth,
      salesVsLastWeek,
      conversionDelta,
    },
  };
};
