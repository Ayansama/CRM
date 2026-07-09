'use client';

import React from 'react';
import { Database, CheckCircle, AlertTriangle } from 'lucide-react';

interface SummaryCardsProps {
  totalRows: number;
  successCount: number;
  skippedCount: number;
}

export default function SummaryCards({
  totalRows,
  successCount,
  skippedCount,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
      {/* Total Rows */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center space-x-4 shadow-sm">
        <div className="p-3 bg-secondary rounded-lg border border-border">
          <Database className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Records
          </p>
          <p className="text-xl font-bold text-foreground mt-0.5">{totalRows}</p>
        </div>
      </div>

      {/* Successful Imports */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center space-x-4 shadow-sm border-l-4 border-l-emerald-500">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Successful Leads
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {successCount}
          </p>
        </div>
      </div>

      {/* Skipped Rows */}
      <div className={`bg-card border border-border rounded-xl p-5 flex items-center space-x-4 shadow-sm ${skippedCount > 0 ? 'border-l-4 border-l-amber-500' : ''}`}>
        <div className={`p-3 rounded-lg border ${skippedCount > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900' : 'bg-secondary border-border'}`}>
          <AlertTriangle className={`w-5 h-5 ${skippedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Skipped Leads
          </p>
          <p className={`text-xl font-bold mt-0.5 ${skippedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
            {skippedCount}
          </p>
        </div>
      </div>
    </div>
  );
}
