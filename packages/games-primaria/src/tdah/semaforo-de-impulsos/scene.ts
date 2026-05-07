import * as Phaser from "phaser";
import { BaseScene, type BaseSceneRuntimeConfig } from "@iidta/core/engine/scenes";
import {
  DIAGNOSTIC,
  PALETTE,
  PRACTICE_LEVELS,
  type CompositeRound,
  type GoNoGoRound,
  type PracticeLevel,
} from "./config";
import { ASSETS } from "./assets";
import type { SemaforoImpulsosMeta } from "./rubric";

export interface SemaforoImpulsosRuntime extends BaseSceneRuntimeConfig {
  mode: "diagnostic" | "practice";
  practiceLevel?: PracticeLevel;
  onPracticeFinished?: (summary: { hits: number; errors: number; meanRTms: number }) => void;
}

interface GoNoGoStimulus {
  isGo: boolean;
}

const KEY_MASCOT = "iidta:mascot";
const SOUND_CLICK = "iidta:click";
const SOUND_CORRECT = "iidta:correct";
const SOUND_WRONG = "iidta:wrong";
const SOUND_LEVELUP = "iidta:levelup";

type SemaforoState = "idle" | "go" | "nogo";

export class SemaforoImpulsosScene extends BaseScene {
  private mode: "diagnostic" | "practice" = "diagnostic";
  private practiceLevel?: PracticeLevel;
  private onPracticeFinished?: (s: { hits: number; errors: number; meanRTms: number }) => void;

  private commissions = 0;
  private omissions = 0;
  private goCount = 0;
  private noGoCount = 0;

  private currentStimulus: GoNoGoStimulus | null = null;
  private hasRespondedToCurrent = false;
  private stimulusStartTs = 0;

  // Visual elements
  private redLight?: Phaser.GameObjects.Arc;
  private greenLight?: Phaser.GameObjects.Arc;
  private greenLightHalo?: Phaser.GameObjects.Arc;
  private redLightHighlight?: Phaser.GameObjects.Arc;
  private greenLightHighlight?: Phaser.GameObjects.Arc;
  private semaforoHit?: Phaser.GameObjects.Rectangle;
  private hintBgG?: Phaser.GameObjects.Graphics;
  private hintText?: Phaser.GameObjects.Text;
  private hintContainer?: Phaser.GameObjects.Container;
  private hudHitsText?: Phaser.GameObjects.Text;
  private hudErrorsText?: Phaser.GameObjects.Text;
  private progressBarG?: Phaser.GameObjects.Graphics;
  private progressBarParams?: { x: number; y: number; w: number; h: number };
  private mascotImg?: Phaser.GameObjects.Image;
  private mascotBubbleG?: Phaser.GameObjects.Graphics;
  private mascotText?: Phaser.GameObjects.Text;
  private feedbackOverlay?: Phaser.GameObjects.Rectangle;
  private feedbackText?: Phaser.GameObjects.Text;
  private pulseTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: "SemaforoImpulsosScene" });
  }

  override init(data?: SemaforoImpulsosRuntime): void {
    super.init(data);
    const cfg = this.runtime as SemaforoImpulsosRuntime;
    this.mode = cfg.mode;
    this.practiceLevel = cfg.practiceLevel;
    this.onPracticeFinished = cfg.onPracticeFinished;

    this.commissions = 0;
    this.omissions = 0;
    this.goCount = 0;
    this.noGoCount = 0;
    this.currentStimulus = null;
    this.hasRespondedToCurrent = false;
    this.stimulusStartTs = 0;
  }

  preload(): void {
    this.load.image(KEY_MASCOT, ASSETS.mascot);
    this.load.audio(SOUND_CLICK, ASSETS.sounds.click);
    this.load.audio(SOUND_CORRECT, ASSETS.sounds.correct);
    this.load.audio(SOUND_WRONG, ASSETS.sounds.wrong);
    this.load.audio(SOUND_LEVELUP, ASSETS.sounds.levelUp);
  }

  override create(): void {
    super.create();

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.bgHex).setOrigin(0);

    // Order matters: feedbackOverlay (full-screen rect alpha 0) DEBE crearse
    // ANTES del semáforo, para que el hit-rect del semáforo quede por encima
    // y reciba pointerdown. Adicionalmente fijamos depths explícitas para
    // robustez ante futuros cambios de orden.
    this.buildFeedback(width, height);
    this.buildTopBar(width, height);
    this.buildHint(width, height);
    this.buildSemaforo(width, height);
    this.buildMascot(width, height);

    this.setSemaforoState("idle");

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
    // Progress bar fina, centrada arriba.
    const barW = 320;
    const barH = 6;
    const barX = (width - barW) / 2;
    const barY = 26;

    // Track (gris claro)
    const track = this.add.graphics();
    track.fillStyle(0xe5e7eb, 1);
    track.fillRoundedRect(barX, barY, barW, barH, barH / 2);

    // Fill (coral) — actualizado en update()
    this.progressBarG = this.add.graphics();
    this.progressBarParams = { x: barX, y: barY, w: barW, h: barH };

    // HUD: dos badges separados arriba a la derecha.
    // Verde para aciertos (📬), rojo para errores (⚠️).
    const badgeW = 76;
    const badgeH = 36;
    const gap = 8;
    const totalW = badgeW * 2 + gap;
    const startX = width - totalW - 18;
    const badgeY = 14;

    // Badge de aciertos (verde claro)
    const hitsX = startX;
    const hitsBg = this.add.graphics();
    hitsBg.fillStyle(0xecfdf5, 1); // verde-50
    hitsBg.fillRoundedRect(hitsX, badgeY, badgeW, badgeH, badgeH / 2);
    hitsBg.lineStyle(1, 0xa7f3d0, 1); // verde-200
    hitsBg.strokeRoundedRect(hitsX, badgeY, badgeW, badgeH, badgeH / 2);
    this.hudHitsText = this.add
      .text(hitsX + badgeW / 2, badgeY + badgeH / 2, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "18px",
        color: "#047857", // verde-700
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Badge de errores (rojo claro)
    const errX = startX + badgeW + gap;
    const errBg = this.add.graphics();
    errBg.fillStyle(0xfef2f2, 1); // rojo-50
    errBg.fillRoundedRect(errX, badgeY, badgeW, badgeH, badgeH / 2);
    errBg.lineStyle(1, 0xfecaca, 1); // rojo-200
    errBg.strokeRoundedRect(errX, badgeY, badgeW, badgeH, badgeH / 2);
    this.hudErrorsText = this.add
      .text(errX + badgeW / 2, badgeY + badgeH / 2, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "18px",
        color: "#B91C1C", // rojo-700
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.updateHud();
  }

  private buildHint(width: number, _height: number): void {
    const cx = width / 2;
    const y = 84;
    const pillW = 360;
    const pillH = 56;
    const pillR = pillH / 2;

    // Container para animar slide-in fácilmente
    const container = this.add.container(cx, y);
    this.hintContainer = container;

    // Sombra
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.06);
    shadow.fillRoundedRect(-pillW / 2, -pillH / 2 + 4, pillW, pillH, pillR);
    container.add(shadow);

    // Pill
    this.hintBgG = this.add.graphics();
    this.hintBgG.fillStyle(0xffffff, 1);
    this.hintBgG.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, pillR);
    container.add(this.hintBgG);

    this.hintText = this.add
      .text(0, 0, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "26px",
        color: PALETTE.textDark,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(this.hintText);
  }

  private buildSemaforo(width: number, height: number): void {
    const cx = width / 2;
    const cy = height / 2 + 30;
    const lightRadius = 64;
    const spacing = 152;

    const housingW = lightRadius * 2 + 50;
    const housingH = spacing + lightRadius * 2 + 50;
    const cornerR = 22;

    // Sombra realista del semáforo
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.18);
    shadow.fillRoundedRect(
      cx - housingW / 2 + 6,
      cy - housingH / 2 + 14,
      housingW,
      housingH,
      cornerR,
    );

    // Carcasa con bordes redondeados
    const housing = this.add.graphics();
    housing.fillStyle(PALETTE.housing, 1);
    housing.fillRoundedRect(
      cx - housingW / 2,
      cy - housingH / 2,
      housingW,
      housingH,
      cornerR,
    );
    housing.lineStyle(3, 0x0f172a, 1);
    housing.strokeRoundedRect(
      cx - housingW / 2,
      cy - housingH / 2,
      housingW,
      housingH,
      cornerR,
    );

    // Halo del verde (debajo de la luz para efecto glow)
    this.greenLightHalo = this.add.circle(
      cx,
      cy + spacing / 2,
      lightRadius + 14,
      PALETTE.go,
      0,
    );

    // Luces base con borde sutil
    this.redLight = this.add
      .circle(cx, cy - spacing / 2, lightRadius, PALETTE.idle)
      .setStrokeStyle(2, 0x0a0a0f, 0.4);
    this.greenLight = this.add
      .circle(cx, cy + spacing / 2, lightRadius, PALETTE.idle)
      .setStrokeStyle(2, 0x0a0a0f, 0.4);

    // Highlights (gradiente simulado con círculos blancos semi-transparentes)
    // Solo visibles cuando la luz está encendida.
    this.redLightHighlight = this.add
      .circle(cx - lightRadius * 0.32, cy - spacing / 2 - lightRadius * 0.32, lightRadius * 0.28, 0xffffff, 0.5)
      .setVisible(false);
    this.greenLightHighlight = this.add
      .circle(cx - lightRadius * 0.32, cy + spacing / 2 - lightRadius * 0.32, lightRadius * 0.28, 0xffffff, 0.5)
      .setVisible(false);

    // Hit zone clickeable (rect invisible). Siempre interactivo;
    // handleSemaforoTap() decide según currentStimulus.
    const hit = this.add
      .rectangle(cx, cy, housingW, housingH, 0xffffff, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);
    hit.on("pointerdown", () => this.handleSemaforoTap());
    this.semaforoHit = hit;
  }

  private buildMascot(_width: number, height: number): void {
    // Mascota abajo a la izquierda, con burbuja narrativa.
    const mascotX = 64;
    const mascotY = height - 60;
    this.mascotImg = this.add
      .image(mascotX, mascotY, KEY_MASCOT)
      .setOrigin(0.5)
      .setDisplaySize(80, 80);

    // Burbuja
    const bubbleX = mascotX + 52;
    const bubbleY = mascotY;
    const bubbleW = 220;
    const bubbleH = 44;
    const bubbleR = 18;

    this.mascotBubbleG = this.add.graphics();
    this.mascotBubbleG.fillStyle(0xffffff, 1);
    this.mascotBubbleG.fillRoundedRect(
      bubbleX,
      bubbleY - bubbleH / 2,
      bubbleW,
      bubbleH,
      bubbleR,
    );
    this.mascotBubbleG.lineStyle(1, 0xe5e7eb, 1);
    this.mascotBubbleG.strokeRoundedRect(
      bubbleX,
      bubbleY - bubbleH / 2,
      bubbleW,
      bubbleH,
      bubbleR,
    );
    // Cola triangular hacia la mascota
    this.mascotBubbleG.fillStyle(0xffffff, 1);
    this.mascotBubbleG.fillTriangle(
      bubbleX,
      bubbleY - 6,
      bubbleX,
      bubbleY + 6,
      bubbleX - 8,
      bubbleY,
    );

    this.mascotText = this.add
      .text(bubbleX + bubbleW / 2, bubbleY, "Espera tranquilo…", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "15px",
        color: PALETTE.textDark,
      })
      .setOrigin(0.5);
  }

  private buildFeedback(width: number, height: number): void {
    // El overlay (flash sutil de fondo) queda al fondo — ok que esté tapado.
    this.feedbackOverlay = this.add
      .rectangle(0, 0, width, height, PALETTE.bgHex, 0)
      .setOrigin(0);

    // El text de feedback ("¡BIEN!" / "¡UPS!") debe ir POR ENCIMA del hint,
    // del semáforo y de todo. Lo centramos verticalmente y le damos depth alto.
    this.feedbackText = this.add
      .text(width / 2, height / 2, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "104px",
        fontStyle: "bold",
        color: PALETTE.textLight,
        stroke: "#0F172A",
        strokeThickness: 10,
        shadow: {
          offsetX: 0,
          offsetY: 6,
          color: "#000000",
          blur: 12,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1000);
  }

  // ---------------- State ----------------

  private setSemaforoState(state: SemaforoState): void {
    if (!this.redLight || !this.greenLight || !this.greenLightHalo) return;

    // El cursor se maneja vía DOM en el canvas según el estado, sin tocar
    // el InputHandler de Phaser (que se rompe con disable/setInteractive
    // dinámicos). El zone permanece siempre interactivo.
    const canvas = this.game.canvas;

    if (state === "idle") {
      this.redLight.setFillStyle(PALETTE.idle);
      this.greenLight.setFillStyle(PALETTE.idle);
      this.greenLightHalo.setFillStyle(PALETTE.go, 0);
      this.redLightHighlight?.setVisible(false);
      this.greenLightHighlight?.setVisible(false);
      this.stopPulse();
      if (canvas) canvas.style.cursor = "default";
      this.setHint("Mira la luz…", PALETTE.textDark);
      this.setMascotText("Espera tranquilo…");
    } else if (state === "go") {
      this.redLight.setFillStyle(PALETTE.idle);
      this.greenLight.setFillStyle(PALETTE.go);
      this.greenLightHalo.setFillStyle(PALETTE.go, 0.4);
      this.redLightHighlight?.setVisible(false);
      this.greenLightHighlight?.setVisible(true);
      this.startPulse();
      if (canvas) canvas.style.cursor = "pointer";
      this.setHint("¡VERDE! Toca", "#047857");
      this.setMascotText("¡Llegó la carta!");
    } else {
      // nogo
      this.redLight.setFillStyle(PALETTE.noGo);
      this.greenLight.setFillStyle(PALETTE.idle);
      this.greenLightHalo.setFillStyle(PALETTE.go, 0);
      this.redLightHighlight?.setVisible(true);
      this.greenLightHighlight?.setVisible(false);
      this.stopPulse();
      if (canvas) canvas.style.cursor = "not-allowed";
      this.setHint("ROJO · No toques", "#B91C1C");
      this.setMascotText("Ahora no, espera…");
    }
  }

  private setHint(text: string, color: string): void {
    if (!this.hintText) return;
    this.hintText.setText(text);
    this.hintText.setColor(color);
  }

  private setMascotText(text: string): void {
    if (!this.mascotText) return;
    if (this.mascotText.text === text) return;
    this.mascotText.setText(text);
  }

  private startPulse(): void {
    if (!this.greenLightHalo) return;
    this.stopPulse();
    this.pulseTween = this.tweens.add({
      targets: this.greenLightHalo,
      scale: { from: 1, to: 1.18 },
      alpha: { from: 0.4, to: 0.1 },
      duration: 600,
      ease: "Sine.inOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private stopPulse(): void {
    this.pulseTween?.stop();
    this.pulseTween = undefined;
    if (this.greenLightHalo) {
      this.greenLightHalo.setScale(1);
    }
  }

  private updateHud(): void {
    this.hudHitsText?.setText(`📬 ${this.hits}`);
    this.hudErrorsText?.setText(`⚠️ ${this.commissions}`);
  }

  // ---------------- Diagnostic ----------------

  private async runDiagnostic(): Promise<void> {
    const stimuli = this.generateStimuli(DIAGNOSTIC.goCount, DIAGNOSTIC.noGoCount);
    this.goCount = DIAGNOSTIC.goCount;
    this.noGoCount = DIAGNOSTIC.noGoCount;

    for (const s of stimuli) {
      if (this.ended) break;
      await this.presentStimulus(s, DIAGNOSTIC.cycleMs, DIAGNOSTIC.stimulusDurationMs);
    }

    if (!this.ended) this.endChallenge();
  }

  protected override getEndMetadata(): Record<string, unknown> | undefined {
    if (this.mode !== "diagnostic") return undefined;

    const meanRTms =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;

    const meta: SemaforoImpulsosMeta = {
      phase: "diagnostic",
      goCount: this.goCount,
      noGoCount: this.noGoCount,
      hits: this.hits,
      commissions: this.commissions,
      omissions: this.omissions,
      meanRTms,
    };

    return meta as unknown as Record<string, unknown>;
  }

  // ---------------- Practice ----------------

  private async runPractice(level: PracticeLevel): Promise<void> {
    const cfg = PRACTICE_LEVELS[level];
    if (cfg.type === "go-nogo") {
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
      errors: this.errors + this.commissions,
      meanRTms,
    });
  }

  private async runRound(cfg: GoNoGoRound): Promise<void> {
    const goN = Math.round(cfg.totalStimuli * cfg.goRatio);
    const noGoN = cfg.totalStimuli - goN;
    this.goCount += goN;
    this.noGoCount += noGoN;
    const stimuli = this.generateStimuli(goN, noGoN);
    for (const s of stimuli) {
      if (this.ended) break;
      await this.presentStimulus(s, cfg.cycleMs, cfg.stimulusDurationMs);
    }
  }

  private async runComposite(cfg: CompositeRound): Promise<void> {
    for (const round of cfg.rounds) {
      if (this.ended) break;
      await this.runRound(round);
    }
  }

  // ---------------- Stimulus generation ----------------

  private generateStimuli(go: number, noGo: number): GoNoGoStimulus[] {
    const list: GoNoGoStimulus[] = [];
    for (let i = 0; i < go; i++) list.push({ isGo: true });
    for (let i = 0; i < noGo; i++) list.push({ isGo: false });
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = list[i];
      const b = list[j];
      if (a !== undefined && b !== undefined) {
        list[i] = b;
        list[j] = a;
      }
    }
    return list;
  }

  // ---------------- Stimulus presentation ----------------

  private presentStimulus(
    s: GoNoGoStimulus,
    cycleMs: number,
    stimulusDurationMs: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const isiMs = Math.max(0, cycleMs - stimulusDurationMs);

      this.setSemaforoState("idle");
      this.currentStimulus = null;
      this.hasRespondedToCurrent = false;

      this.time.delayedCall(isiMs, () => {
        if (this.ended) {
          resolve();
          return;
        }
        this.currentStimulus = s;
        this.hasRespondedToCurrent = false;
        this.stimulusStartTs = Date.now();
        this.setSemaforoState(s.isGo ? "go" : "nogo");

        this.time.delayedCall(stimulusDurationMs, () => {
          if (!this.hasRespondedToCurrent && s.isGo) {
            this.omissions += 1;
            this.emitTelemetry("user_response", { correct: false, type: "omission" });
          }
          this.currentStimulus = null;
          this.setSemaforoState("idle");
          resolve();
        });
      });
    });
  }

  // ---------------- User response ----------------

  private handleSemaforoTap(): void {
    if (this.ended) return;
    if (!this.currentStimulus || this.hasRespondedToCurrent) {
      this.sound.play(SOUND_CLICK, { volume: 0.2 });
      return;
    }
    this.hasRespondedToCurrent = true;
    const rt = Date.now() - this.stimulusStartTs;
    const s = this.currentStimulus;

    if (s.isGo) {
      this.recordHit(rt, { type: "hit" });
      this.flashSuccess();
      this.sound.play(SOUND_CORRECT, { volume: 0.4 });
    } else {
      this.commissions += 1;
      this.recordError(rt, { type: "commission" });
      this.flashError();
      this.sound.play(SOUND_WRONG, { volume: 0.4 });
    }
    this.updateHud();
  }

  private flashSuccess(): void {
    this.showFeedbackText("¡BIEN!", "#10B981");
    this.flash(PALETTE.go);
  }

  private flashError(): void {
    this.showFeedbackText("¡UPS!", "#EF4444");
    this.flash(PALETTE.noGo);
  }

  private showFeedbackText(text: string, color: string): void {
    if (!this.feedbackText) return;
    const fb = this.feedbackText;
    fb.setText(text);
    fb.setColor(color);
    // Aseguramos depth alto cada vez (en caso de que algo nuevo se haya
    // creado por encima durante un Fast Refresh).
    fb.setDepth(1000);

    // Pop-in (220ms back.out) → hold (350ms) → fade-out con expansión (480ms).
    fb.setAlpha(0);
    fb.setScale(0.6);
    this.tweens.add({
      targets: fb,
      alpha: 1,
      scale: 1,
      duration: 220,
      ease: "Back.out",
      onComplete: () => {
        this.tweens.add({
          targets: fb,
          alpha: { from: 1, to: 0 },
          scale: { from: 1, to: 1.35 },
          duration: 480,
          delay: 350,
          ease: "Sine.out",
        });
      },
    });
  }

  private flash(color: number): void {
    if (!this.feedbackOverlay) return;
    this.feedbackOverlay.setFillStyle(color, 0.18);
    this.tweens.add({
      targets: this.feedbackOverlay,
      fillAlpha: 0,
      duration: 300,
      ease: "Sine.out",
    });
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
