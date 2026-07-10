'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CrmRecord, SkippedRecord } from '@groweasy/shared-types';

interface ResultsTableProps {
  records: CrmRecord[];
  skipped: SkippedRecord[];
}

export default function ResultsTable({ records, skipped }: ResultsTableProps) {
  const [activeTab, setActiveTab] = useState<'success' | 'skipped'>('success');

  return (
    <div className="w-full space-y-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('success')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'success'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Extracted Leads ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('skipped')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'skipped'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Skipped Leads ({skipped.length})
        </button>
      </div>

      {/* Tables */}
      {activeTab === 'success' ? (
        <SuccessTable records={records} />
      ) : (
        <SkippedTable skipped={skipped} />
      )}
    </div>
  );
}

// Successful Records Table Component
function SuccessTable({ records }: { records: CrmRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: (info: any) => info.getValue() || <span className="text-muted-foreground/60">—</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info: any) => info.getValue() || <span className="text-muted-foreground/60">—</span>,
      },
      {
        id: 'phone',
        header: 'Phone',
        accessorFn: (row: CrmRecord) =>
          row.country_code
            ? `+${row.country_code} ${row.mobile_without_country_code}`
            : row.mobile_without_country_code,
        cell: (info: any) => info.getValue() || <span className="text-muted-foreground/60">—</span>,
      },
      {
        accessorKey: 'company',
        header: 'Company',
        cell: (info: any) => info.getValue() || <span className="text-muted-foreground/60">—</span>,
      },
      {
        accessorKey: 'crm_status',
        header: 'Status',
        cell: (info: any) => {
          const val = info.getValue();
          if (!val) return <span className="text-muted-foreground/60">—</span>;
          const bgMap: Record<string, string> = {
            GOOD_LEAD_FOLLOW_UP: 'bg-blue-50 text-blue-700 border-blue-150',
            DID_NOT_CONNECT: 'bg-slate-50 text-slate-700 border-slate-150',
            BAD_LEAD: 'bg-red-50 text-red-700 border-red-150',
            SALE_DONE: 'bg-emerald-50 text-emerald-700 border-emerald-150',
          };
          return (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                bgMap[val] || 'bg-secondary text-muted-foreground border-border'
              }`}
            >
              {val.replace(/_/g, ' ')}
            </span>
          );
        },
      },
      {
        accessorKey: 'data_source',
        header: 'Source',
        cell: (info: any) => info.getValue() || <span className="text-muted-foreground/60">—</span>,
      },
      {
        accessorKey: 'created_at',
        header: 'Date Created',
        cell: (info: any) => {
          const val = info.getValue();
          if (!val) return '—';
          return new Date(val).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 40,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  if (records.length === 0) {
    return (
      <div className="text-center py-8 bg-card border border-border rounded-xl text-muted-foreground text-sm">
        No records successfully extracted in this import.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto max-h-[400px] border border-border bg-card rounded-xl shadow-inner relative"
    >
      <table className="w-full text-left border-collapse table-auto">
        <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10 border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border/60">
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                {row.getVisibleCells().map((cell) => {
                  const val = cell.getValue();
                  const tooltip = typeof val === 'object' && val !== null ? JSON.stringify(val) : (val ? String(val) : '');
                  return (
                    <td
                      key={cell.id}
                      title={tooltip || undefined}
                      className="px-4 py-2 text-sm text-foreground max-w-[200px] truncate whitespace-nowrap align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Skipped Records Table Component
function SkippedTable({ skipped }: { skipped: SkippedRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'row_index',
        header: 'CSV Line',
        cell: (info: any) => {
          const val = info.getValue();
          // Add 1 to index to represent physical CSV row index (header is line 1, data starts at line 2)
          return <span className="font-mono text-xs font-bold text-muted-foreground">{val + 2}</span>;
        },
      },
      {
        accessorKey: 'reason',
        header: 'Skip Reason',
        cell: (info: any) => (
          <span className="font-semibold text-red-600 dark:text-red-400">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'raw',
        header: 'Original Row Data Preview',
        cell: (info: any) => {
          const val = info.getValue() || {};
          return (
            <code className="text-[11px] font-mono text-muted-foreground max-w-[450px] block truncate" title={JSON.stringify(val)}>
              {JSON.stringify(val)}
            </code>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: skipped,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 40,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  if (skipped.length === 0) {
    return (
      <div className="text-center py-8 bg-card border border-border rounded-xl text-muted-foreground text-sm">
        No records were skipped in this import.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto max-h-[400px] border border-border bg-card rounded-xl shadow-inner relative"
    >
      <table className="w-full text-left border-collapse table-auto">
        <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10 border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border/60">
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr key={row.id} className="hover:bg-muted/40 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-2.5 text-sm text-foreground align-middle max-w-[280px] truncate"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
