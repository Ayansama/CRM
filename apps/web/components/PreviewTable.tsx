'use client';

import React, { useRef, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

interface PreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
}

export default function PreviewTable({ headers, rows }: PreviewTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Map columns from CSV headers
  const columns = useMemo(() => {
    return headers.map((header) => ({
      accessorKey: header,
      header: header,
      cell: (info: any) => {
        const val = info.getValue();
        return typeof val === 'string' ? val : JSON.stringify(val);
      },
    }));
  }, [headers]);

  // 2. Set up React Table core
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows: tableRows } = table.getRowModel();

  // 3. Set up TanStack Virtual row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36, // Average row height in pixels
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // Calculate spacers
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          CSV Raw Data Preview ({rows.length} rows)
        </h3>
      </div>

      {/* Outer Scroll Container */}
      <div
        ref={containerRef}
        className="w-full overflow-auto max-h-[380px] border border-border bg-card rounded-xl relative shadow-inner"
      >
        <table className="w-full text-left border-collapse table-auto">
          {/* Sticky Header */}
          <thead className="sticky top-0 bg-secondary/95 backdrop-blur-sm z-10 border-b border-border shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* Virtualized Body */}
          <tbody className="divide-y divide-border/60">
            {/* Top Spacing Row */}
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
              </tr>
            )}

            {/* Rendered Virtual Rows */}
            {virtualItems.map((virtualRow) => {
              const row = tableRows[virtualRow.index];
              return (
                <tr
                  key={row.id}
                  className="hover:bg-muted/40 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-2 text-sm text-foreground max-w-[260px] truncate whitespace-nowrap align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}

            {/* Bottom Spacing Row */}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
