import { EventEmitter } from 'events';
import { Response } from 'express';
import { ProgressEvent } from '@groweasy/shared-types';

class SseManager {
  private emitter = new EventEmitter();

  constructor() {
    // Increase limit to accommodate multiple concurrent clients safely
    this.emitter.setMaxListeners(100);
  }

  /**
   * Subscribes a client connection (Express response) to real-time progress events for a specific import job.
   */
  subscribe(importId: string, res: Response): () => void {
    const listener = (event: ProgressEvent) => {
      res.write(`event: progress\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    this.emitter.on(importId, listener);

    // Return an unsubscribe handler to be invoked when the connection closes
    return () => {
      this.emitter.off(importId, listener);
    };
  }

  /**
   * Broadcasts a progress event (e.g. mapping, extracting batch count, completion) to all listeners of an import job.
   */
  broadcast(importId: string, event: ProgressEvent): void {
    this.emitter.emit(importId, event);
  }
}

export const sseManager = new SseManager();
