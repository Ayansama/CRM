'use client';

import React from 'react';

interface DayLevelGridProps {
  today: {
    total: number;
    contacted: number;
    goodLeads: number;
    badLeads: number;
    didntConnect: number;
    saleDone: number;
  };
}

export default function DayLevelGrid({ today }: DayLevelGridProps) {
  const items = [
    { label: 'Total Leads', value: today.total, change: '+12.4%' },
    { label: 'Contacted', value: today.contacted, change: '+12.4%' },
    { label: 'Good Leads', value: today.goodLeads, change: '+12.4%' },
    { label: 'Bad Leads', value: today.badLeads, change: '+12.4%' },
    { label: 'Didn\'t Connect', value: today.didntConnect, change: '+12.4%' },
    { label: 'Sale Done', value: today.saleDone, change: '+12.4%' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-secondary/40 border border-border/80 rounded-xl p-3.5 flex flex-col justify-between hover:bg-secondary/60 hover:border-border transition-all"
        >
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {item.label}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl font-black text-foreground leading-none">{item.value}</span>
            <span className="text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded-full leading-none">
              {item.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
