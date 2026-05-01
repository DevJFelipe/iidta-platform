import type { TelemetryEvent } from "../scoring/types";

export interface TelemetryClientOptions {
  endpoint: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  onError?: (err: unknown, batch: TelemetryEvent[]) => void;
}

export class TelemetryClient {
  private queue: TelemetryEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly endpoint: string;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly onError: (err: unknown, batch: TelemetryEvent[]) => void;

  constructor(opts: TelemetryClientOptions) {
    this.endpoint = opts.endpoint;
    this.flushIntervalMs = opts.flushIntervalMs ?? 5000;
    this.maxBatchSize = opts.maxBatchSize ?? 50;
    this.onError = opts.onError ?? (() => {});
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  emit(event: TelemetryEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
      if (!res.ok) throw new Error(`telemetry http ${res.status}`);
    } catch (err) {
      this.queue.unshift(...batch);
      this.onError(err, batch);
    }
  }
}
