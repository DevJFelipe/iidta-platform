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
    // Phaser pasa `{}` por defecto a init() para escenas auto-iniciadas, NO
    // `undefined`. Por eso `data ?? registry.get(...)` no funciona (`{}` es
    // truthy y no-nullish). Detectamos si `data` trae los campos esperados;
    // si no, leemos de game.registry["runtime"] (set por PhaserMount.preBoot).
    const looksValid =
      data != null &&
      typeof data === "object" &&
      "challengeId" in data &&
      typeof (data as { challengeId: unknown }).challengeId === "string";
    const runtime = looksValid
      ? (data as BaseSceneRuntimeConfig)
      : (this.game.registry.get("runtime") as BaseSceneRuntimeConfig | undefined);
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
      // +2s de margen sobre la duración planeada. La scene debe terminar el
      // loop de estímulos por su cuenta antes; este timer es solo safety net
      // en caso de que el loop se cuelgue. Sin margen, hay race condition
      // entre el timer y el loop que cierra naturalmente — el timer puede
      // ganar y perder la metadata específica del reto.
      const timeoutMs = (this.runtime.diagnosticDurationSec + 2) * 1000;
      this.diagnosticTimer = this.time.delayedCall(timeoutMs, () => this.endChallenge());
    }
  }

  /**
   * Override en subclases para devolver la metadata específica del reto
   * (targetCount, hits, commissions, omissions, etc.). Se incluye
   * automáticamente en `raw.metadata` cuando endChallenge() corre, ya sea
   * por safety timer o por terminación natural del scene.
   */
  protected getEndMetadata(): Record<string, unknown> | undefined {
    return undefined;
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

    // Si el caller no pasa metadata explícita, pedimos a la subclase la suya
    // vía getEndMetadata(). Garantiza que ambas vías de finalización
    // (timer safety y terminación natural) producen el mismo raw.metadata.
    const metadata = extraMeta ?? this.getEndMetadata();

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
      metadata,
    };

    this.emit("challenge_ended", { hits: this.hits, errors: this.errors });
    this.runtime.onComplete(raw);
  }
}
