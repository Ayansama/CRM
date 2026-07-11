'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ActivityTrendPoint {
  day: number;
  label: string;
  dateStr: string;
  totalLeads: number;
  contacted: number;
  goodLead: number;
  badLead: number;
  didntConnect: number;
  saleDone: number;
}

interface ActivityTrendChartProps {
  data: ActivityTrendPoint[];
}

export default function ActivityTrendChart({ data }: ActivityTrendChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-secondary/10 rounded-xl min-h-[260px]">
        <span className="text-sm text-muted-foreground animate-pulse">Loading trend chart...</span>
      </div>
    );
  }

  const hasData = data.some((d) => d.totalLeads > 0);

  return (
    <div className="flex-1 w-full min-h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 16, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />

          <XAxis
            dataKey="label"
            type="category"
            tick={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            dy={8}
          />

          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            dx={-4}
            width={28}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              fontSize: '11px',
            }}
            labelStyle={{ fontWeight: 700, fontSize: '11px', color: 'var(--foreground)', marginBottom: 4 }}
            itemStyle={{ fontSize: '11px', padding: '1px 0' }}
            cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
          />

          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingBottom: 8 }}
          />

          <Line name="Total Leads"    type="monotone" dataKey="totalLeads"   stroke="#3b82f6" strokeWidth={2}   dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          <Line name="Contacted"      type="monotone" dataKey="contacted"    stroke="#22c55e" strokeWidth={2}   dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          <Line name="Good Lead"      type="monotone" dataKey="goodLead"     stroke="#a855f7" strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line name="Bad Lead"       type="monotone" dataKey="badLead"      stroke="#ef4444" strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line name="Didn't Connect" type="monotone" dataKey="didntConnect" stroke="#f97316" strokeWidth={1.5} dot={{ r: 2 }} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line name="Sale Done"      type="monotone" dataKey="saleDone"     stroke="#06b6d4" strokeWidth={2}   dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>

      {!hasData && (
        <p className="text-center text-xs text-muted-foreground/50 font-medium -mt-6">
          No lead activity in the last 7 days
        </p>
      )}
    </div>
  );
}
