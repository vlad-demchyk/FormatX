/**
 * Generic pool of Web Workers for parallel task execution.
 *
 * Distributes work across `navigator.hardwareConcurrency` workers
 * (or a custom count) so the browser can process multiple files simultaneously.
 */

type WorkerFactory = () => Worker;

export interface PoolResult<T> {
  id: string;
  ok: boolean;
  data?: T;
  error?: string;
}

interface QueuedTask {
  id: string;
  message: unknown;
  transfer?: Transferable[];
  resolve: (result: PoolResult<unknown>) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private idle: number[] = [];
  private queue: QueuedTask[] = [];
  private resultMap = new Map<string, (result: PoolResult<unknown>) => void>();

  constructor(
    factory: WorkerFactory,
    count: number = Math.max(1, navigator.hardwareConcurrency ?? 4),
  ) {
    for (let i = 0; i < count; i++) {
      const worker = factory();
      const idx = i;

      worker.onmessage = (e: MessageEvent) => {
        const { id, blob, error } = e.data;

        if (id && this.resultMap.has(id)) {
          const resolve = this.resultMap.get(id)!;
          this.resultMap.delete(id);

          if (error) {
            resolve({ id, ok: false, error });
          } else {
            resolve({ id, ok: true, data: { blob } });
          }
        }

        this.idle.push(idx);
        this.dispatchNext();
      };

      worker.onerror = (err) => {
        console.error(`[WorkerPool] Worker ${idx} error:`, err);
        this.idle.push(idx);
        this.dispatchNext();
      };

      this.workers.push(worker);
      this.idle.push(idx);
    }
  }

  /** Submit a task. Returns a promise that resolves with the result. */
  exec<T = unknown>(
    id: string,
    message: unknown,
    transfer?: Transferable[],
  ): Promise<PoolResult<T>> {
    return new Promise((resolve) => {
      this.queue.push({ id, message, transfer, resolve: resolve as (r: PoolResult<unknown>) => void });
      this.dispatchNext();
    });
  }

  private dispatchNext(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const idx = this.idle.shift()!;
      const task = this.queue.shift()!;

      this.resultMap.set(task.id, task.resolve);
      this.workers[idx]!.postMessage(task.message, task.transfer ?? []);
    }
  }

  /** Terminate all workers. Call when no longer needed. */
  destroy(): void {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.idle = [];
    this.queue = [];
    this.resultMap.clear();
  }

  get size(): number {
    return this.workers.length;
  }
}
