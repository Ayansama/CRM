'use client';

import React from 'react';
import { Link2 } from 'lucide-react';

interface SourceCardProps {
  name: string;
  logo: React.ReactNode;
  status: string;
  statusType: 'connected' | 'inactive';
  onConnect?: () => void;
}

export default function SourceCard({ name, logo, status, statusType, onConnect }: SourceCardProps) {
  return (
    <div className="bg-card text-card-foreground border border-border hover:border-muted-foreground/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
      <div className="flex items-center space-x-4">
        {/* Logo Container */}
        <div className="w-12 h-12 rounded-xl bg-secondary/50 border border-border flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
          {logo}
        </div>
        
        {/* Source Details */}
        <div className="space-y-1">
          <h3 className="font-bold text-sm tracking-tight text-foreground">{name}</h3>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground/80 tracking-wider">Status</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${statusType === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground font-medium">{status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onConnect}
        className="px-4 py-2 border border-border hover:border-foreground/20 rounded-xl text-xs font-semibold text-foreground bg-secondary/20 hover:bg-secondary/60 transition-all flex items-center space-x-1.5 shadow-sm group-hover:translate-x-0.5"
      >
        <Link2 className="w-3.5 h-3.5" />
        <span>Connect</span>
      </button>
    </div>
  );
}
