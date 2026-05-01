import * as Phaser from "phaser";
import type { ChallengeRawResult, TelemetryEvent, TelemetryEventType } from "../scoring/types";

export interface BaseSceneRuntimeConfig {
  challengeId: string;
  studentCode: string;
  sessionId: string;
  diagnosticMode: boolean;
  diagnosticDurationSec: number;
  onComplete: (raw: ChallengeRawResult) => void;
  onTelemetry?: (event: TelemetryEvent) => void;
}

export abstract class BaseScene extends Phaser.Scene {
  protected runtime!: BaseSceneRuntimeConfig;

  protected hits = 0;
  protected errors = 0;
  protected attempts = 0;
  protected responseTimes: number[] = [];
  protected startedAt = 0;
  protected ended = false;

  private diagnosticTimer?: Phaser.Time.TimerEvent;

  init(data?: BaseSceneRuntimeConfig): void {
    // data llega de scene.start(key, data); si no, leemos game.registry
    // (set por PhaserMount.preBoot al instanciar el Game).
    const runtime =
      data ?? (this.game.registry.get("runtime") as BaseSceneRuntimeConfig | undefined);
    if (!runtime) {
      throw new Error(
        "BaseScene.init: missing runtime config — pasalo por scene.start(data) o vía PhaserMount.sceneInitData",
      );
    }
    this.runtime = runtime;
    this.hits = 0;
    this.errors = 0;
    this.attempts = 0;
    this.responseTimes = [];
    this.startedAt = 0;
    this.ended = false;
  }

  create(): void {
    this.startedAt = Date.now();
    this.emit("challenge_started", {
      diagnosticMode: this.runtime.diagnosticMode,
      diagnosticDurationSec: this.runtime.diagnosticDurationSec,
    });

    if (this.runtime.diagnosticMode) {
      this.diagnosticTimer = this.time.delayedCall(this.runtime.diagnosticDurationSec * 1000, () =>
        this.endChallenge(),
      );
    }
  }

  protected emit(type: TelemetryEventType, data?: Record<string, unknown>): void {
    if (!this.runtime.onTelemetry) return;
    this.runtime.onTelemetry({
      type,
      challengeId: this.runtime.challengeId,
      studentCode: this.runtime.studentCode,
      sessionId: this.runtime.sessionId,
      ts: Date.now(),
      data,
    });
  }

  protected recordHit(responseTimeMs: number, meta?: Record<string, unknown>): void {
    this.hits += 1;
    this.responseTimes.push(responseTimeMs);
    this.emit("user_response", { correct: true, responseTimeMs, ...meta });
  }

  protected recordError(responseTimeMs: number, meta?: Record<string, unknown>): void {
    this.errors += 1;
    this.responseTimes.push(responseTimeMs);
    this.emit("user_response", { correct: false, responseTimeMs, ...meta });
  }

  protected recordAttempt(): void {
    this.attempts += 1;
  }

  protected endChallenge(extraMeta?: Record<string, unknown>): void {
    if (this.ended) return;
    this.ended = true;
    this.diagnosticTimer?.remove();

    const raw: ChallengeRawResult = {
      challengeId: this.runtime.challengeId,
      studentCode: this.runtime.studentCode,
      sessionId: this.runtime.sessionId,
      startedAt: this.startedAt,
      endedAt: Date.now(),
      hits: this.hits,
      errors: this.errors,
      attempts: this.attempts,
      responseTimes: [...this.responseTimes],
      metadata: extraMeta,
    };

    this.emit("challenge_ended", { hits: this.hits, errors: this.errors });
    this.runtime.onComplete(raw);
  }
}
