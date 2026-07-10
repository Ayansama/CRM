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
  hour: number;
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

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  const chartData = data.map((d) => ({
    ...d,
    timeLabel: formatHour(d.hour),
  }));

  if (!mounted) {
    return (
      <div className="h-[260px] flex items-center justify-center bg-secondary/10 rounded-xl">
        <span className="text-sm text-muted-foreground animate-pulse">Loading trend chart...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: -20,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
          
          <XAxis
            dataKey="hour"
            tickFormatter={formatHour}
            stroke="#9ca3af"
            fontSize={10}
            fontWeight={600}
            tickLine={false}
            axisLine={false}
            dy={8}
            interval={2}
          />
          
          <YAxis
            stroke="#9ca3af"
            fontSize={10}
            fontWeight={600}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            dx={-8}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
            labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: 'var(--foreground)' }}
            itemStyle={{ fontSize: '11px', padding: '1px 0' }}
            labelFormatter={(h) => `Time: ${formatHour(h as number)}`}
          />

          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280' }}
          />

          <Line
            name="Total Leads"
            type="monotone"
            dataKey="totalLeads"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            name="Contacted"
            type="monotone"
            dataKey="contacted"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            name="Good Lead"
            type="monotone"
            dataKey="goodLead"
            stroke="#a855f7"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            name="Bad Lead"
            type="monotone"
            dataKey="badLead"
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            name="Didn't Connect"
            type="monotone"
            dataKey="didntConnect"
            stroke="#f97316"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Line
            name="Sale Done"
            type="monotone"
            dataKey="saleDone"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
