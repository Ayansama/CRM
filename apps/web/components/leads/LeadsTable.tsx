'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CrmRecord } from '@groweasy/shared-types';
import { ChevronRight } from 'lucide-react';

interface LeadsTableProps {
  leads: CrmRecord[];
}

export default function LeadsTable({ leads }: LeadsTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a soft background color class for lead owner initials
  const getAvatarBg = (name: string) => {
    const charCode = name.charCodeAt(0) || 0;
    const colors = [
      'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
      'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
      'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
      'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
      'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400',
    ];
    return colors[charCode % colors.length];
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Lead Name',
        cell: (info: any) => info.getValue() || <span className="text-muted-foreground/60">—</span>,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info: any) => {
          const email = info.getValue() || '';
          if (!email) return <span className="text-muted-foreground/60">—</span>;
          const display = email.length > 28 ? `${email.substring(0, 26)}...` : email;
          return <span className="font-medium">{display}</span>;
        },
      },
      {
        id: 'contact',
        header: 'Contact',
        accessorFn: (row: CrmRecord) => {
          const cc = row.country_code ? row.country_code.replace(/\+/g, '') : '';
          const num = row.mobile_without_country_code || '';
          if (!num) return '';
          return cc ? `+${cc} ${num}` : num;
        },
        cell: (info: any) => info.getValue() || <span className="text-muted-foreground/60">—</span>,
      },
      {
        accessorKey: 'created_at',
        header: 'Date Created',
        cell: (info: any) => {
          const val = info.getValue();
          if (!val) return <span className="text-muted-foreground/60">—</span>;
          const date = new Date(val);
          if (isNaN(date.getTime())) return val;
          return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        },
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
          // Map to standard status labels and badge stylings
          const statusLabels: Record<string, string> = {
            GOOD_LEAD_FOLLOW_UP: 'Good Lead',
            DID_NOT_CONNECT: "Didn't Connect",
            BAD_LEAD: 'Bad Lead',
            SALE_DONE: 'Sale Done',
          };
          const bgMap: Record<string, string> = {
            GOOD_LEAD_FOLLOW_UP: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800',
            DID_NOT_CONNECT: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800',
            BAD_LEAD: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800',
            SALE_DONE: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800',
          };

          const label = statusLabels[val] || 'Not Dialed';
          const style = bgMap[val] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800';

          return (
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold inline-block ${style}`}>
              {label}
            </span>
          );
        },
      },
      {
        id: 'quality',
        header: 'Quality',
        cell: () => <span className="text-muted-foreground/60">—</span>,
      },
      {
        accessorKey: 'lead_owner',
        header: 'Lead Owner',
        cell: (info: any) => {
          const owner = info.getValue() || '';
          if (!owner) return <span className="text-muted-foreground/60">—</span>;
          const initial = owner.charAt(0).toUpperCase();
          return (
            <div className="flex items-center space-x-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarBg(owner)}`}>
                {initial}
              </div>
              <span className="text-xs font-semibold text-foreground/80">{owner}</span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: () => (
          <button className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center space-x-0.5 transition-colors">
            <span>More</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground text-sm">
        No leads match your criteria. Import leads from the Lead Sources page to populate this view.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-auto max-h-[550px] border border-border bg-card rounded-xl relative shadow-sm"
    >
      <table className="w-full text-left border-collapse table-auto">
        <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10 border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap"
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
                      className="px-4 py-2.5 text-sm text-foreground max-w-[220px] truncate whitespace-nowrap align-middle"
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
