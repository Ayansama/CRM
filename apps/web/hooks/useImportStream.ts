'use client';

import { useState, useEffect, useRef } from 'react';

export interface ProgressState {
  stage: 'mapping' | 'extracting' | 'done' | 'error' | null;
  message: string;
  batchesDone: number;
  totalBatches: number;
  successCount: number;
  skippedCount: number;
}

export const useImportStream = (importId: string | null) => {
  const [state, setState] = useState<ProgressState>({
    stage: null,
    message: 'Initializing...',
    batchesDone: 0,
    totalBatches: 0,
    successCount: 0,
    skippedCount: 0,
  });
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSseConnected = useRef(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!importId) return;

    // Start SSE Connection
    const connectSse = () => {
      const sseUrl = `${apiUrl}/api/import/${importId}/stream`;
      console.log(`Connecting to SSE: ${sseUrl}`);
      
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('SSE connection established.');
        isSseConnected.current = true;
        setError(null);
      };

      es.addEventListener('progress', (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('SSE Progress Event:', data);

          setState((prev) => ({
            stage: data.stage || prev.stage,
            message: data.message || prev.message,
            batchesDone: data.batchesDone !== undefined ? data.batchesDone : prev.batchesDone,
            totalBatches: data.totalBatches !== undefined ? data.totalBatches : prev.totalBatches,
            successCount: data.successCount !== undefined ? data.successCount : prev.successCount,
            skippedCount: data.skippedCount !== undefined ? data.skippedCount : prev.skippedCount,
          }));

          if (data.stage === 'done') {
            es.close();
            clearPolling();
          }

          if (data.stage === 'error') {
            es.close();
            clearPolling();
            setError(data.message || 'Import failed during processing.');
          }
        } catch (err) {
          console.error('Error parsing SSE event data:', err);
        }
      });

      es.onerror = (err) => {
        console.warn('SSE encountered an error. Falling back to polling.', err);
        es.close();
        isSseConnected.current = false;
        startPolling(); // Trigger fallback polling immediately
      };
    };

    // Fallback Polling Mechanism
    const startPolling = () => {
      if (pollingIntervalRef.current) return; // Already polling

      console.log('Initiating polling fallback...');
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch(`${apiUrl}/api/import/${importId}/result`);
          if (!response.ok) {
            throw new Error('Failed to fetch results via polling');
          }

          const result = await response.json();
          const totalRows = result.totalRows;
          const successCount = result.successCount;
          const skippedCount = result.skippedCount;
          const processedCount = successCount + skippedCount;
          
          const totalBatches = Math.ceil(totalRows / 25);
          const batchesDone = Math.min(totalBatches, Math.floor(processedCount / 25));

          const isCompleted = processedCount >= totalRows;

          setState({
            stage: isCompleted ? 'done' : 'extracting',
            message: isCompleted ? 'Import completed successfully.' : `Processing: ${processedCount} of ${totalRows} rows finished.`,
            batchesDone,
            totalBatches,
            successCount,
            skippedCount,
          });

          if (isCompleted) {
            clearPolling();
          }
        } catch (err: any) {
          console.error('Polling error:', err);
          setError(err.message || 'Error occurred during polling fallback.');
          clearPolling();
        }
      }, 3000);
    };

    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Establish connection
    connectSse();

    // Cleanup hook on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearPolling();
    };
  }, [importId, apiUrl]);

  return { state, error };
};
