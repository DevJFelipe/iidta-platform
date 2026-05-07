import * as Phaser from "phaser";
import { BaseScene, type BaseSceneRuntimeConfig } from "@iidta/core/engine/scenes";
import {
  DIAGNOSTIC,
  PALETTE,
  PRACTICE_LEVELS,
  type CompositeRound,
  type NumberLineRound,
  type PracticeLevel,
  type RangeConfig,
} from "./config";
import { ASSETS } from "./assets";
import type { LineaNumericaMeta } from "./rubric";

export interface LineaNumericaRuntime extends BaseSceneRuntimeConfig {
  mode: "diagnostic" | "practice";
  practiceLevel?: PracticeLevel;
  onPracticeFinished?: (summary: { hits: number; errors: number; meanRTms: number }) => void;
}

type Kind = "hit" | "near" | "far";

interface TrialResult {
  target: number;
  placed: number;
  errorAbs: number;
  errorPct: number;
  kind: Kind;
}

const KEY_MASCOT = "iidta:astronautB";
const SOUND_PICKUP = "iidta:pickup";
const SOUND_CORRECT = "iidta:correct";
const SOUND_WRONG = "iidta:wrong";
const SOUND_LEVELUP = "iidta:levelup";

// Layout constants (canvas 800x600).
const TRACK_X0 = 80;
const TRACK_X1 = 720;
const TRACK_Y = 320;
const TRACK_W = TRACK_X1 - TRACK_X0;

export class LineaNumericaScene extends BaseScene {
  private mode: "diagnostic" | "practice" = "diagnostic";
  private practiceLevel?: PracticeLevel;
  private onPracticeFinished?: (s: { hits: number; errors: number; meanRTms: number }) => void;

  // Stats — `far` se cuenta como `BaseScene.errors` (vía recordError); `near`
  // vive en su propio contador y NO incrementa errors (no es un fallo
  // categórico). `omissions` para timeouts.
  private nearMisses = 0;
  private omissions = 0;
  private totalTrials = 0;
  private trialResults: TrialResult[] = [];

  // Trial state
  private currentTarget = 0;
  private currentRange: RangeConfig = DIAGNOSTIC.range;
  private currentTimeoutMs: number = DIAGNOSTIC.trialTimeoutMs;
  private trialStartTs = 0;
  private trialTimer?: Phaser.Time.TimerEvent;
  private trialResolved = false;
  private resolveTrial?: () => void;

  // Visual elements
  private targetText?: Phaser.GameObjects.Text;
  private trackG?: Phaser.GameObjects.Graphics;
  private trackTickG?: Phaser.GameObjects.Graphics;
  private trackLabelMin?: Phaser.GameObjects.Text;
  private trackLabelMax?: Phaser.GameObjects.Text;
  private markerHit?: Phaser.GameObjects.Rectangle;
  private markerVisualG?: Phaser.GameObjects.Graphics;
  private ghostG?: Phaser.GameObjects.Graphics;

  // UI
  private hudHitsText?: Phaser.GameObjects.Text;
  private hudErrorsText?: Phaser.GameObjects.Text;
  private progressBarG?: Phaser.GameObjects.Graphics;
  private progressBarParams?: { x: number; y: number; w: number; h: number };
  private mascotImg?: Phaser.GameObjects.Image;
  private mascotText?: Phaser.GameObjects.Text;
  private feedbackText?: Phaser.GameObjects.Text;
  private feedbackOverlay?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "LineaNumericaScene" });
  }

  override init(data?: LineaNumericaRuntime): void {
    super.init(data);
    const cfg = this.runtime as LineaNumericaRuntime;
    this.mode = cfg.mode;
    this.practiceLevel = cfg.practiceLevel;
    this.onPracticeFinished = cfg.onPracticeFinished;

    this.nearMisses = 0;
    this.omissions = 0;
    this.totalTrials = 0;
    this.trialResults = [];
    this.trialResolved = false;
  }

  preload(): void {
    this.load.image(KEY_MASCOT, ASSETS.mascot);
    this.load.audio(SOUND_PICKUP, ASSETS.sounds.pickUp);
    this.load.audio(SOUND_CORRECT, ASSETS.sounds.correct);
    this.load.audio(SOUND_WRONG, ASSETS.sounds.wrong);
    this.load.audio(SOUND_LEVELUP, ASSETS.sounds.levelUp);
  }

  override create(): void {
    super.create();
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.bgHex).setOrigin(0);

    this.buildFeedback(width, height);
    this.buildTopBar(width, height);
    this.buildTargetDisplay(width, height);
    this.buildTrack(width, height);
    this.buildMarker(width, height);
    this.buildMascot(width, height);

    this.attachDragHandlers();

    if (this.mode === "diagnostic") {
      void this.runDiagnostic();
    } else if (this.practiceLevel != null) {
      void this.runPractice(this.practiceLevel);
    }
  }

  override update(): void {
    if (
      this.mode === "diagnostic" &&
      this.startedAt > 0 &&
      !this.ended &&
      this.progressBarG &&
      this.progressBarParams
    ) {
      const elapsed = Date.now() - this.startedAt;
      const total = (this.runtime.diagnosticDurationSec || 1) * 1000;
      const pct = Math.min(1, elapsed / total);
      const { x, y, w, h } = this.progressBarParams;
      this.progressBarG.clear();
      this.progressBarG.fillStyle(PALETTE.primary, 1);
      const fillW = Math.max(0.1, w * pct);
      this.progressBarG.fillRoundedRect(x, y, fillW, h, h / 2);
    }
  }

  // ---------------- UI builders ----------------

  private buildTopBar(width: number, _height: number): void {
    const barW = 320;
    const barH = 6;
    const barX = (width - barW) / 2;
    const barY = 26;
    const track = this.add.graphics();
    track.fillStyle(PALETTE.surfaceLight, 1);
    track.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    this.progressBarG = this.add.graphics();
    this.progressBarParams = { x: barX, y: barY, w: barW, h: barH };

    const badgeW = 76;
    const badgeH = 36;
    const gap = 8;
    const totalW = badgeW * 2 + gap;
    const startX = width - totalW - 18;
    const badgeY = 14;

    const hitsX = startX;
    const hitsBg = this.add.graphics();
    hitsBg.fillStyle(0x064e3b, 1);
    hitsBg.fillRoundedRect(hitsX, badgeY, badgeW, badgeH, badgeH / 2);
    hitsBg.lineStyle(1, 0x10b981, 0.6);
    hitsBg.strokeRoundedRect(hitsX, badgeY, badgeW, badgeH, badgeH / 2);
    this.hudHitsText = this.add
      .text(hitsX + badgeW / 2, badgeY + badgeH / 2, "", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "16px",
        color: "#34D399",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const errX = startX + badgeW + gap;
    const errBg = this.add.graphics();
    errBg.fillStyle(0x7f1d1d, 1);
    errBg.fillRoundedRect(errX, badgeY, badgeW, badgeH, badgeH / 2);
    errBg.lineStyle(1, 0xef4444, 0.6);
    errBg.strokeRoundedRect(errX, badgeY, badgeW, badgeH, badgeH / 2);
    this.hudErrorsText = this.add
      .text(errX + badgeW / 2, badgeY + badgeH / 2, "", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "16px",
        color: "#FCA5A5",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.updateHud();
  }

  private buildTargetDisplay(width: number, _height: number): void {
    this.add
      .text(width / 2, 78, "ESTIMA LA POSICIÓN", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "11px",
        color: PALETTE.textMuted,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.targetText = this.add
      .text(width / 2, 130, "0", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "72px",
        color: PALETTE.primaryHex,
        fontStyle: "bold",
        stroke: "#022B33",
        strokeThickness: 2,
        shadow: { offsetX: 0, offsetY: 0, color: PALETTE.primaryHex, blur: 16, fill: false },
      })
      .setOrigin(0.5);
  }

  private buildTrack(_width: number, _height: number): void {
    // Línea principal — track Slate-700 con borde redondeado.
    this.trackG = this.add.graphics();
    this.trackG.fillStyle(PALETTE.surfaceLight, 1);
    this.trackG.fillRoundedRect(TRACK_X0, TRACK_Y - 3, TRACK_W, 6, 3);
    this.trackG.lineStyle(1, PALETTE.primary, 0.5);
    this.trackG.strokeRoundedRect(TRACK_X0, TRACK_Y - 3, TRACK_W, 6, 3);

    // Marcas en extremos (verticales más altas)
    const endTickH = 24;
    this.trackG.fillStyle(PALETTE.primary, 0.8);
    this.trackG.fillRect(TRACK_X0 - 2, TRACK_Y - endTickH / 2, 4, endTickH);
    this.trackG.fillRect(TRACK_X1 - 2, TRACK_Y - endTickH / 2, 4, endTickH);

    // Container para ticks intermedios (se redibuja por trial según range.ticks).
    this.trackTickG = this.add.graphics();

    // Etiquetas extremos
    this.trackLabelMin = this.add
      .text(TRACK_X0, TRACK_Y + 22, "0", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "18px",
        color: PALETTE.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    this.trackLabelMax = this.add
      .text(TRACK_X1, TRACK_Y + 22, "100", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "18px",
        color: PALETTE.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    // Ghost (marcador fantasma para mostrar respuesta correcta en práctica)
    this.ghostG = this.add.graphics().setAlpha(0).setDepth(40);
  }

  private buildMarker(width: number, _height: number): void {
    const homeX = width / 2;
    const size = 56;

    // El marker vive siempre sobre la línea (TRACK_Y). El estudiante solo
    // controla X. Esto evita la confusión de "tener que subir el marker"
    // antes de poder estimar.
    const hit = this.add
      .rectangle(homeX, TRACK_Y, size, size, 0xffffff, 0)
      .setOrigin(0.5)
      .setInteractive({ draggable: true, useHandCursor: true })
      .setDepth(60);
    this.markerHit = hit;

    // Visual triangular (apunta hacia arriba, asentado sobre la línea)
    this.markerVisualG = this.add.graphics().setDepth(61);
    this.drawMarker(homeX, TRACK_Y);

    // NOTA: deliberadamente NO mostramos el valor numérico durante el drag.
    // El paradigma NLE mide estimación espacial pura — si el estudiante ve
    // "47" mientras coloca el marcador, deja de estimar y empieza a leer.
  }

  private drawMarker(cx: number, cy: number): void {
    if (!this.markerVisualG) return;
    const g = this.markerVisualG;
    g.clear();
    // Punta superior triangular + cuerpo cuadrado redondeado debajo.
    g.fillStyle(PALETTE.accent, 1);
    g.fillTriangle(cx, cy - 22, cx - 16, cy + 2, cx + 16, cy + 2);
    g.fillRoundedRect(cx - 14, cy + 2, 28, 18, 6);
    g.lineStyle(2, 0xffffff, 0.4);
    g.strokeTriangle(cx, cy - 22, cx - 16, cy + 2, cx + 16, cy + 2);
    g.strokeRoundedRect(cx - 14, cy + 2, 28, 18, 6);
  }

  private buildMascot(_width: number, height: number): void {
    const mascotX = 110;
    const mascotY = height - 90;
    this.mascotImg = this.add
      .image(mascotX, mascotY, KEY_MASCOT)
      .setOrigin(0.5)
      .setDisplaySize(240, 240);

    const bubbleX = mascotX + 96;
    const bubbleY = mascotY + 30;
    const bubbleW = 290;
    const bubbleH = 42;
    const bubbleR = 16;

    const g = this.add.graphics();
    g.fillStyle(PALETTE.surface, 0.95);
    g.fillRoundedRect(bubbleX, bubbleY - bubbleH / 2, bubbleW, bubbleH, bubbleR);
    g.lineStyle(1, PALETTE.primary, 0.5);
    g.strokeRoundedRect(bubbleX, bubbleY - bubbleH / 2, bubbleW, bubbleH, bubbleR);
    g.fillTriangle(bubbleX, bubbleY - 5, bubbleX, bubbleY + 5, bubbleX - 7, bubbleY);

    this.mascotText = this.add
      .text(bubbleX + bubbleW / 2, bubbleY, "ZARA online. Calibrando coordenadas…", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "14px",
        color: PALETTE.textLight,
      })
      .setOrigin(0.5);
  }

  private buildFeedback(width: number, height: number): void {
    this.feedbackOverlay = this.add
      .rectangle(0, 0, width, height, PALETTE.bgHex, 0)
      .setOrigin(0);
    this.feedbackText = this.add
      .text(width / 2, height / 2, "", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "84px",
        fontStyle: "bold",
        color: PALETTE.textLight,
        stroke: "#0F172A",
        strokeThickness: 8,
        shadow: { offsetX: 0, offsetY: 4, color: "#000000", blur: 12, fill: true },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1000);
  }

  // ---------------- Drag handlers ----------------

  private attachDragHandlers(): void {
    this.input.on(
      "dragstart",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject !== this.markerHit || this.trialResolved) return;
        this.sound.play(SOUND_PICKUP, { volume: 0.15 });
      },
    );

    this.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
      ) => {
        if (gameObject !== this.markerHit) return;
        // Snap permanente a la línea: el marker SIEMPRE está sobre TRACK_Y
        // durante el drag — solo X es controlable. Esto evita que el
        // estudiante necesite "subir" el marker antes de posicionarlo y
        // garantiza que cualquier dragend produzca una evaluación válida.
        const clampedX = Phaser.Math.Clamp(dragX, TRACK_X0, TRACK_X1);
        this.markerHit?.setPosition(clampedX, TRACK_Y);
        this.drawMarker(clampedX, TRACK_Y);
      },
    );

    this.input.on(
      "dragend",
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject !== this.markerHit || this.trialResolved) return;
        const m = this.markerHit;
        if (!m) return;
        // Soltar siempre evalúa — no hay "zona segura" para cancelar.
        // Es coherente con el paradigma NLE: el primer juicio cuenta.
        this.evaluatePlacement(m.x);
      },
    );
  }

  // ---------------- Trial flow ----------------

  private xToValue(x: number, range: RangeConfig): number {
    const pct = (x - TRACK_X0) / TRACK_W;
    return range.min + pct * (range.max - range.min);
  }

  private valueToX(value: number, range: RangeConfig): number {
    const pct = (value - range.min) / (range.max - range.min);
    return TRACK_X0 + pct * TRACK_W;
  }

  private formatValue(value: number, range: RangeConfig): string {
    if (range.decimals === 0) return String(Math.round(value));
    return value.toFixed(range.decimals);
  }

  private evaluatePlacement(actualX: number): void {
    if (this.trialResolved) return;
    this.trialResolved = true;
    this.trialTimer?.remove();
    this.trialTimer = undefined;

    const placedValue = this.xToValue(actualX, this.currentRange);
    const errorAbs = Math.abs(placedValue - this.currentTarget);
    const rangeSpan = this.currentRange.max - this.currentRange.min;
    const errorPct = rangeSpan > 0 ? errorAbs / rangeSpan : 1;
    const tol = this.currentRange.toleranceFraction;
    const kind: Kind = errorPct <= tol ? "hit" : errorPct <= tol * 2 ? "near" : "far";
    const rt = Date.now() - this.trialStartTs;

    this.trialResults.push({
      target: this.currentTarget,
      placed: placedValue,
      errorAbs,
      errorPct,
      kind,
    });

    if (kind === "hit") {
      this.recordHit(rt, {
        target: this.currentTarget,
        placed: placedValue,
        errorAbs,
        errorPct,
        kind,
      });
      this.flashFeedback("PRECISO", PALETTE.correct);
      this.setMascotText("Coordenada confirmada.");
      this.sound.play(SOUND_CORRECT, { volume: 0.4 });
    } else if (kind === "near") {
      // `near` NO es un fallo categórico — no llamamos recordError para
      // mantener limpio BaseScene.errors. Solo registramos RT y telemetría.
      this.nearMisses += 1;
      this.responseTimes.push(rt);
      this.emitTelemetry("user_response", {
        correct: false,
        type: "near",
        target: this.currentTarget,
        placed: placedValue,
        errorAbs,
        errorPct,
      });
      this.flashFeedback("CERCA", PALETTE.warning);
      this.setMascotText("Cerca, pero no exacto.");
      this.sound.play(SOUND_WRONG, { volume: 0.25 });
    } else {
      // `far` es el fallo categórico — incrementa BaseScene.errors.
      this.recordError(rt, {
        target: this.currentTarget,
        placed: placedValue,
        errorAbs,
        errorPct,
        kind,
      });
      this.flashFeedback("LEJOS", PALETTE.wrong);
      this.setMascotText("Trayectoria desviada.");
      this.sound.play(SOUND_WRONG, { volume: 0.4 });
    }

    // En práctica: mostrar marcador fantasma 600ms en la posición correcta.
    if (this.mode === "practice" && kind !== "hit") {
      this.showGhostMarker(this.valueToX(this.currentTarget, this.currentRange));
    }

    this.updateHud();
    this.time.delayedCall(900, () => this.resolveTrial?.());
  }

  private showGhostMarker(x: number): void {
    if (!this.ghostG) return;
    const g = this.ghostG;
    g.clear();
    g.fillStyle(PALETTE.correct, 0.7);
    g.fillTriangle(x, TRACK_Y - 22, x - 16, TRACK_Y + 2, x + 16, TRACK_Y + 2);
    g.fillRoundedRect(x - 14, TRACK_Y + 2, 28, 18, 6);
    g.setAlpha(1);
    this.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0 },
      duration: 500,
      delay: 500,
      ease: "Sine.out",
    });
  }

  private async runDiagnostic(): Promise<void> {
    this.currentRange = DIAGNOSTIC.range;
    this.currentTimeoutMs = DIAGNOSTIC.trialTimeoutMs;
    this.applyRangeUI(this.currentRange);
    this.totalTrials = DIAGNOSTIC.trials.length;
    for (const target of DIAGNOSTIC.trials) {
      if (this.ended) break;
      await this.presentTrial(target);
    }
    if (!this.ended) this.endChallenge();
  }

  protected override getEndMetadata(): Record<string, unknown> | undefined {
    if (this.mode !== "diagnostic") return undefined;
    const meanRTms =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;
    const errs = this.trialResults.map((r) => r.errorPct);
    const meanErrorPct = errs.length > 0 ? errs.reduce((a, b) => a + b, 0) / errs.length : 0;
    const sorted = [...errs].sort((a, b) => a - b);
    const medianErrorPct =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 0
          ? ((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2
          : (sorted[(sorted.length - 1) / 2] ?? 0);
    const meta: LineaNumericaMeta = {
      phase: "diagnostic",
      totalTrials: this.totalTrials,
      hits: this.hits,
      near: this.nearMisses,
      far: this.errors,
      omissions: this.omissions,
      meanErrorPct,
      medianErrorPct,
      meanRTms,
      kinds: { hits: this.hits, near: this.nearMisses, far: this.errors },
    };
    return meta as unknown as Record<string, unknown>;
  }

  // ---------------- Practice ----------------

  private async runPractice(level: PracticeLevel): Promise<void> {
    const cfg = PRACTICE_LEVELS[level];
    if (cfg.type === "numberLine") {
      await this.runRound(cfg);
    } else {
      await this.runComposite(cfg);
    }
    this.sound.play(SOUND_LEVELUP);
    const meanRTms =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;
    this.onPracticeFinished?.({
      hits: this.hits,
      errors: this.errors + this.nearMisses,
      meanRTms,
    });
  }

  private async runRound(cfg: NumberLineRound): Promise<void> {
    this.currentRange = cfg.range;
    this.currentTimeoutMs = cfg.trialTimeoutMs;
    this.applyRangeUI(cfg.range);
    this.totalTrials += cfg.trials.length;
    for (const target of cfg.trials) {
      if (this.ended) break;
      await this.presentTrial(target);
    }
  }

  private async runComposite(cfg: CompositeRound): Promise<void> {
    for (const round of cfg.rounds) {
      if (this.ended) break;
      await this.runRound(round);
    }
  }

  // ---------------- Range UI ----------------

  private applyRangeUI(range: RangeConfig): void {
    this.trackLabelMin?.setText(this.formatValue(range.min, range));
    this.trackLabelMax?.setText(this.formatValue(range.max, range));
    // Redibujar ticks intermedios si los hay.
    if (this.trackTickG) {
      const g = this.trackTickG;
      g.clear();
      const ticks = range.ticks;
      if (ticks && ticks.length > 0) {
        g.fillStyle(PALETTE.primary, 0.5);
        for (const t of ticks) {
          const x = this.valueToX(t, range);
          g.fillRect(x - 1, TRACK_Y - 12, 2, 24);
        }
      }
    }
  }

  // ---------------- Trial presentation ----------------

  private presentTrial(target: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.currentTarget = target;
      this.trialResolved = false;
      this.trialStartTs = Date.now();
      this.targetText?.setText(this.formatValue(target, this.currentRange));
      // Reset marker a centro de la línea para el siguiente trial.
      const homeX = this.scale.width / 2;
      this.markerHit?.setPosition(homeX, TRACK_Y);
      this.drawMarker(homeX, TRACK_Y);
      this.ghostG?.setAlpha(0);
      this.setMascotText("Desliza el marcador a la posición y suéltalo.");

      this.resolveTrial = () => {
        this.resolveTrial = undefined;
        resolve();
      };

      this.trialTimer?.remove();
      this.trialTimer = this.time.delayedCall(this.currentTimeoutMs, () => {
        if (this.trialResolved || this.ended) return;
        this.trialResolved = true;
        this.omissions += 1;
        this.emitTelemetry("user_response", {
          correct: false,
          type: "omission",
          target,
        });
        this.flashFeedback("TIEMPO", PALETTE.warning);
        this.setMascotText("Tiempo agotado.");
        this.time.delayedCall(800, () => this.resolveTrial?.());
      });
    });
  }

  // ---------------- Feedback ----------------

  private flashFeedback(text: string, color: number): void {
    if (!this.feedbackText) return;
    const fb = this.feedbackText;
    fb.setText(text);
    fb.setColor("#" + color.toString(16).padStart(6, "0"));
    fb.setDepth(1000);
    fb.setAlpha(0);
    fb.setScale(0.6);
    this.tweens.add({
      targets: fb,
      alpha: 1,
      scale: 1,
      duration: 200,
      ease: "Back.out",
      onComplete: () => {
        this.tweens.add({
          targets: fb,
          alpha: { from: 1, to: 0 },
          scale: { from: 1, to: 1.3 },
          duration: 450,
          delay: 300,
          ease: "Sine.out",
        });
      },
    });
    if (this.feedbackOverlay) {
      this.feedbackOverlay.setFillStyle(color, 0.18);
      this.tweens.add({
        targets: this.feedbackOverlay,
        fillAlpha: 0,
        duration: 320,
        ease: "Sine.out",
      });
    }
  }

  private setMascotText(text: string): void {
    if (!this.mascotText) return;
    if (this.mascotText.text === text) return;
    this.mascotText.setText(text);
  }

  private updateHud(): void {
    this.hudHitsText?.setText(`✓ ${this.hits}`);
    this.hudErrorsText?.setText(`✗ ${this.errors + this.nearMisses}`);
  }

  private emitTelemetry(type: "user_response", data?: Record<string, unknown>): void {
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
}
