'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';

interface DropzoneUploadProps {
  onParsed: (data: { headers: string[]; rows: Record<string, string>[] }, file: File) => void;
}

export default function DropzoneUpload({ onParsed }: DropzoneUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);

    // 1. Validation: Only CSV
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a valid CSV file (.csv).');
      return;
    }

    // 2. Validation: Max 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }

    // 3. Client-side parse via PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];

        if (headers.length === 0) {
          setError('We could not detect any column headers in this CSV.');
          return;
        }

        onParsed({ headers, rows }, file);
      },
      error: (err) => {
        console.error('PapaParse client side error:', err);
        setError('Failed to parse CSV file: ' + err.message);
      }
    });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`w-full border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/55 dark:bg-blue-950/20'
            : 'border-border bg-card hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        {/* Icon Square */}
        <div className="w-12 h-12 rounded-xl border border-border bg-secondary flex items-center justify-center shadow-sm mb-4">
          <UploadCloud className="w-6 h-6 text-muted-foreground" />
        </div>

        {/* Dropzone Copy */}
        <div className="text-center space-y-1.5">
          <p className="text-base font-semibold text-foreground">
            Drop your CSV file here
          </p>
          <p className="text-sm text-muted-foreground">
            or <span className="text-orange-500 font-medium hover:underline">click to browse files</span>
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">
            CSV files only up to 5MB
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
