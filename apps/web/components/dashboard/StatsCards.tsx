'use client';

import React from 'react';
import { Users, CheckCircle, Percent, IndianRupee, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DeltaBadgeProps {
  value: number | null;
  suffix?: string;
}

function DeltaBadge({ value, suffix = '%' }: DeltaBadgeProps) {
  if (value === null) {
    return (
      <div className="flex items-center space-x-1 text-muted-foreground/60 text-xs mt-1">
        <Minus className="w-3.5 h-3.5" />
        <span>no last period data</span>
      </div>
    );
  }

  const isPositive = value > 0;
  const isZero = value === 0;

  if (isZero) {
    return (
      <div className="flex items-center space-x-1 text-slate-500 text-xs font-semibold mt-1">
        <Minus className="w-3.5 h-3.5" />
        <span>no change vs last period</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center space-x-1 text-xs font-semibold mt-1 ${
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      <span>
        {isPositive ? '+' : ''}
        {value}
        {suffix}
      </span>
    </div>
  );
}

interface StatsCardsProps {
  totals: {
    leads: number;
    salesDone: number;
    conversionRate: number;
  };
  delta: {
    leadsVsLastMonth: number | null;
    salesVsLastWeek: number | null;
    conversionDelta: number | null;
  };
}

export default function StatsCards({ totals, delta }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Total Leads Card */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Total Leads</h3>
          <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">{totals.leads}</p>
          <DeltaBadge value={delta.leadsVsLastMonth} />
        </div>
      </div>

      {/* Sales Done Card */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Sales Done</h3>
          <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">{totals.salesDone}</p>
          <DeltaBadge value={delta.salesVsLastWeek} />
        </div>
      </div>

      {/* Conversion Rate Card */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Conversion Rate</h3>
          <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-lg">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">{totals.conversionRate}%</p>
          <DeltaBadge value={delta.conversionDelta} suffix=" pts" />
        </div>
      </div>

      {/* Revenue Card (Placeholder) */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-sm space-y-3 relative overflow-hidden group hover:shadow-md transition-all">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Revenue</h3>
          <div className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-lg">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div>
          <p className="text-3xl font-extrabold tracking-tight text-foreground">—</p>
          <p className="text-xs text-muted-foreground/60 mt-1.5 font-medium leading-none">
            Revenue tracking coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
