'use client';

import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ProgressState } from '../hooks/useImportStream';

interface ProgressPanelProps {
  state: ProgressState;
  error: string | null;
}

export default function ProgressPanel({ state, error }: ProgressPanelProps) {
  const { stage, message, batchesDone, totalBatches } = state;

  const percentage = totalBatches > 0 
    ? Math.min(100, Math.round((batchesDone / totalBatches) * 100)) 
    : 0;

  const getStageStatusClass = (currentStage: string) => {
    if (error || stage === 'error') return 'border-red-200 bg-red-50 text-red-700';
    if (stage === 'done') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    
    if (stage === currentStage) {
      return 'border-blue-200 bg-blue-50/50 text-blue-700 font-semibold ring-2 ring-blue-500/20';
    }
    
    // Check if stage is completed
    const stagesOrder = ['mapping', 'extracting', 'done'];
    const currentIdx = stagesOrder.indexOf(currentStage);
    const activeIdx = stagesOrder.indexOf(stage || 'mapping');
    
    if (currentIdx < activeIdx) {
      return 'border-emerald-100 bg-emerald-50/30 text-emerald-600';
    }

    return 'border-border bg-muted/30 text-muted-foreground';
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold tracking-tight">Importing Leads...</h2>
        <p className="text-sm text-muted-foreground">
          GrowEasy AI is analyzing, mapping, and normalizing your CSV records.
        </p>
      </div>

      {/* Stage Progression Steps */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Step 1: Mapping */}
        <div className={`border rounded-lg p-3 text-center space-y-1 transition-all ${getStageStatusClass('mapping')}`}>
          <p className="text-xs font-semibold uppercase tracking-wider">Stage 1</p>
          <p className="text-sm font-medium">Schema Mapping</p>
        </div>

        {/* Step 2: Extraction */}
        <div className={`border rounded-lg p-3 text-center space-y-1 transition-all ${getStageStatusClass('extracting')}`}>
          <p className="text-xs font-semibold uppercase tracking-wider">Stage 2</p>
          <p className="text-sm font-medium">Data Extraction</p>
        </div>

        {/* Step 3: Done / Verification */}
        <div className={`border rounded-lg p-3 text-center space-y-1 transition-all ${getStageStatusClass('done')}`}>
          <p className="text-xs font-semibold uppercase tracking-wider">Stage 3</p>
          <p className="text-sm font-medium">Final Verification</p>
        </div>
      </div>

      {/* Progress Bar & Loader */}
      <div className="space-y-3.5 bg-secondary/30 border border-border/60 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {stage !== 'done' && stage !== 'error' && !error ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : stage === 'done' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm font-medium text-foreground">{message}</span>
          </div>
          {stage === 'extracting' && totalBatches > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">
              {batchesDone} / {totalBatches} batches
            </span>
          )}
        </div>

        {/* Bar */}
        <div className="w-full bg-secondary rounded-full h-2 shadow-inner overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              error || stage === 'error'
                ? 'bg-red-500'
                : stage === 'done'
                ? 'bg-emerald-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Bottom Details */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
      </div>

      {/* Failure details */}
      {error && (
        <div className="p-3 border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900 rounded-xl flex items-start space-x-2 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Processing Terminated</p>
            <p className="text-xs leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
