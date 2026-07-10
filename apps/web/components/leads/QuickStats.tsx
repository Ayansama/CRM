'use client';

import React from 'react';

interface QuickStatsProps {
  total: number;
  good: number;
  pending: number;
  conversion: string;
}

export default function QuickStats({ total, good, pending, conversion }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Total Leads */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-1">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total</h3>
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{total}</p>
      </div>

      {/* Good Leads */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-1">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Good</h3>
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{good}</p>
      </div>

      {/* Pending Leads */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-1">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Pending</h3>
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{pending}</p>
      </div>

      {/* Conversion Rate */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-1">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Conversion</h3>
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{conversion}%</p>
      </div>
    </div>
  );
}
