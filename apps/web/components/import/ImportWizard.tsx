'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, ArrowRight, X, AlertTriangle, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DropzoneUpload from '../DropzoneUpload';
import PreviewTable from '../PreviewTable';
import ProgressPanel from '../ProgressPanel';
import SummaryCards from '../SummaryCards';
import ResultsTable from '../ResultsTable';
import { useImportStream } from '../../hooks/useImportStream';
import { ImportResult } from '@groweasy/shared-types';

interface ImportWizardProps {
  onClose?: () => void;
}

export default function ImportWizard({ onClose }: ImportWizardProps) {
  // Upload & Preview states
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Active Import states
  const [importId, setImportId] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Progress stream connection hook
  const { state: streamState, error: streamError } = useImportStream(importId);

  // Fetch final results on completion
  useEffect(() => {
    if (!importId) return;

    if (streamState.stage === 'done' || streamState.stage === 'error') {
      const fetchResults = async () => {
        try {
          const res = await fetch(`${apiUrl}/api/import/${importId}/result`);
          if (!res.ok) throw new Error('Failed to retrieve final results');
          const data = await res.json();
          setResults(data);
        } catch (err: any) {
          console.error('Error fetching final result:', err);
        }
      };

      fetchResults();
    }
  }, [importId, streamState.stage, apiUrl]);

  const handleParsed = (data: { headers: string[]; rows: Record<string, string>[] }, selectedFile: File) => {
    setParsedData(data);
    setFile(selectedFile);
    setUploadError(null);
  };

  const handleCancel = () => {
    setFile(null);
    setParsedData(null);
    setUploadError(null);
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiUrl}/api/import/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload CSV file.');
      }

      const { importId: returnedId } = await response.json();
      setImportId(returnedId);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'An error occurred during file upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!importId) return;

    setIsRetrying(true);
    try {
      const response = await fetch(`${apiUrl}/api/import/${importId}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to trigger retry.');
      }

      setResults(null);
    } catch (err: any) {
      console.error('Retry request failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setUploadError(null);
    setImportId(null);
    setResults(null);
  };

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Header back navigation */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <button
          onClick={onClose}
          className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lead Sources</span>
        </button>
        <span className="bg-cta/10 text-cta text-xs px-2.5 py-0.5 rounded-full font-semibold">
          CSV Importer Wizard
        </span>
      </div>

      {/* Step 1: File selection & upload */}
      {!parsedData && !importId && (
        <div className="space-y-6 max-w-2xl mx-auto py-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Import Leads via CSV</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              Drop your CSV file below to parse the data client-side and preview it before importing it into CRM.
            </p>
          </div>
          <DropzoneUpload onParsed={handleParsed} />
        </div>
      )}

      {/* Step 2: Instant Client-side Preview */}
      {parsedData && !importId && (
        <div className="bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm space-y-6 w-full animate-fade-in">
          {/* File Info Bar */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-secondary rounded-lg border border-border">
                <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm max-w-sm truncate">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file!.size / 1024).toFixed(1)} KB • {parsedData.rows.length} records detected
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Virtualized Table Preview */}
          <PreviewTable headers={parsedData.headers} rows={parsedData.rows} />

          {/* Error Message */}
          {uploadError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4.5 h-4.5 mt-0.5 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Footer CTAs */}
          <div className="flex justify-end items-center space-x-3 pt-4 border-t border-border">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className="px-4 py-2 border border-border rounded-xl hover:bg-secondary text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={isUploading}
              className="bg-cta hover:bg-cta-hover disabled:bg-orange-300 text-cta-foreground font-semibold py-2.5 px-5 rounded-xl transition-colors shadow-sm flex items-center space-x-1.5 text-sm"
            >
              {isUploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <span>Confirm Import</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: SSE Progress Streaming Panel */}
      {importId && !results && (
        <div className="max-w-2xl mx-auto py-8">
          <ProgressPanel state={streamState} error={streamError} />
        </div>
      )}

      {/* Step 4: Final Results Dashboard (after Done or Error) */}
      {importId && results && (
        <div className="space-y-6 w-full animate-fade-in">
          {/* Top status bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-card border border-border rounded-xl p-5 shadow-sm gap-4">
            <div className="flex items-center space-x-3">
              {streamState.stage === 'done' ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-250 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {streamState.stage === 'done' ? 'Import completed!' : 'Import finished with issues'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Job ID: <span className="font-mono">{importId}</span>
                </p>
              </div>
            </div>

            {/* Status Action Buttons */}
            <div className="flex items-center space-x-3 self-end sm:self-center">
              {streamState.stage === 'error' && (
                <button
                  onClick={handleRetryFailed}
                  disabled={isRetrying}
                  className="flex items-center space-x-1.5 px-4 py-2 border border-amber-300 hover:bg-amber-55 bg-amber-50/20 text-amber-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>Retry Failed Batches</span>
                </button>
              )}
              <Link
                href="/leads"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <span>View in Manage Leads</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-cta hover:bg-cta-hover text-cta-foreground rounded-xl text-sm font-semibold transition-colors shadow-sm border border-border"
              >
                Start New Import
              </button>
            </div>
          </div>

          {/* Success Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-250 p-4 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
              <span>{results.successCount} leads imported successfully.</span>
            </div>
            <Link
              href="/leads"
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <span>View in Manage Leads &rarr;</span>
            </Link>
          </div>

          {/* Summary statistics cards */}
          <SummaryCards
            totalRows={results.totalRows}
            successCount={results.successCount}
            skippedCount={results.skippedCount}
          />

          {/* Main Tabs Data List */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <ResultsTable records={results.records} skipped={results.skipped} />
          </div>
        </div>
      )}
    </div>
  );
}
