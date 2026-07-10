'use client';

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StatusPieChartProps {
  byStatus: {
    GOOD_LEAD_FOLLOW_UP: number;
    DID_NOT_CONNECT: number;
    BAD_LEAD: number;
    SALE_DONE: number;
    uncontacted: number;
  };
}

export default function StatusPieChart({ byStatus }: StatusPieChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total =
    byStatus.GOOD_LEAD_FOLLOW_UP +
    byStatus.DID_NOT_CONNECT +
    byStatus.BAD_LEAD +
    byStatus.SALE_DONE +
    byStatus.uncontacted;

  const data = [
    { name: 'Good Lead', value: byStatus.GOOD_LEAD_FOLLOW_UP, color: '#22c55e' },
    { name: 'Didn\'t Connect', value: byStatus.DID_NOT_CONNECT, color: '#3b82f6' },
    { name: 'Bad Lead', value: byStatus.BAD_LEAD, color: '#ef4444' },
    { name: 'Sale Done', value: byStatus.SALE_DONE, color: '#6366f1' },
    { name: 'Not Contacted', value: byStatus.uncontacted, color: '#9ca3af' },
  ].filter((item) => item.value > 0);

  if (!mounted) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm h-[380px] flex items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">Loading chart...</div>
      </div>
    );
  }

  // Placeholder data if no leads exist yet
  const hasData = total > 0;
  const chartData = hasData ? data : [{ name: 'No data', value: 1, color: '#e5e7eb' }];

  return (
    <div className="bg-card text-card-foreground border border-border rounded-2xl p-5 shadow-sm flex flex-col h-[380px]">
      <h3 className="font-bold text-sm text-foreground">Status Analytics</h3>
      <p className="text-xs text-muted-foreground mt-0.5">Distribution of leads by current status</p>

      {/* Donut Chart Container */}
      <div className="flex-1 relative min-h-[180px] flex items-center justify-center mt-3">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {hasData && (
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--radius)',
                }}
                itemStyle={{ color: 'var(--foreground)', fontSize: '12px' }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span className="text-2xl font-extrabold tracking-tight text-foreground">{total}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
            Total Leads
          </span>
        </div>
      </div>

      {/* Custom Legend */}
      <div className="border-t border-border/55 pt-4 mt-2 space-y-1.5 overflow-y-auto max-h-[110px]">
        {hasData ? (
          [
            { label: 'Good Lead', val: byStatus.GOOD_LEAD_FOLLOW_UP, color: 'bg-[#22c55e]' },
            { label: 'Didn\'t Connect', val: byStatus.DID_NOT_CONNECT, color: 'bg-[#3b82f6]' },
            { label: 'Bad Lead', val: byStatus.BAD_LEAD, color: 'bg-[#ef4444]' },
            { label: 'Sale Done', val: byStatus.SALE_DONE, color: 'bg-[#6366f1]' },
            { label: 'Not Contacted', val: byStatus.uncontacted, color: 'bg-[#9ca3af]' },
          ].map((item) => {
            const percent = total > 0 ? Math.round((item.val / total) * 100) : 0;
            return (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`} />
                  <span className="font-medium text-foreground/80">{item.label}</span>
                </div>
                <span className="font-semibold text-muted-foreground">
                  {item.val} <span className="text-[10px] font-normal text-muted-foreground/60">({percent}%)</span>
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-center text-xs text-muted-foreground/60 py-3 font-medium">
            No lead data. Import leads to see distribution breakdown.
          </p>
        )}
      </div>
    </div>
  );
}
