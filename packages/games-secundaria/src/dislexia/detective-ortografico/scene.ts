import * as Phaser from "phaser";
import { BaseScene, type BaseSceneRuntimeConfig } from "@iidta/core/engine/scenes";
import {
  DIAGNOSTIC,
  PALETTE,
  PRACTICE_LEVELS,
  WORD_BANK,
  type CompositeRound,
  type PracticeLevel,
  type WordCategory,
  type WordPair,
  type WordRound,
} from "./config";
import { ASSETS } from "./assets";
import type { DetectiveOrtograficoMeta } from "./rubric";

export interface DetectiveRuntime extends BaseSceneRuntimeConfig {
  mode: "diagnostic" | "practice";
  practiceLevel?: PracticeLevel;
  onPracticeFinished?: (summary: { hits: number; errors: number; meanRTms: number }) => void;
}

interface WordInstance {
  pair: WordPair;
  shown: string;
  isCorrect: boolean;
}

const KEY_MASCOT = "iidta:astronaut";
const SOUND_PICKUP = "iidta:pickup";
const SOUND_CORRECT = "iidta:correct";
const SOUND_WRONG = "iidta:wrong";
const SOUND_LEVELUP = "iidta:levelup";

export class DetectiveOrtograficoScene extends BaseScene {
  private mode: "diagnostic" | "practice" = "diagnostic";
  private practiceLevel?: PracticeLevel;
  private onPracticeFinished?: (s: { hits: number; errors: number; meanRTms: number }) => void;

  private commissions = 0;
  private omissions = 0;
  private totalWords = 0;
  private hitsPerCategory: Record<WordCategory, number> = { bv: 0, h: 0, consonantes: 0 };
  private totalPerCategory: Record<WordCategory, number> = { bv: 0, h: 0, consonantes: 0 };

  private currentWord?: WordInstance;
  private wordStartTs = 0;
  private wordTimer?: Phaser.Time.TimerEvent;
  private currentTimeoutMs: number = DIAGNOSTIC.wordTimeoutMs;
  private resolveWord?: () => void;
  private wordResolved = false;

  // Word entity (draggable)
  private wordCard?: Phaser.GameObjects.Rectangle;
  private wordText?: Phaser.GameObjects.Text;
  private wordHomeXY?: { x: number; y: number };

  // Drop zones
  private zoneCorrect?: Phaser.GameObjects.Rectangle;
  private zoneError?: Phaser.GameObjects.Rectangle;

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
    super({ key: "DetectiveOrtograficoScene" });
  }

  override init(data?: DetectiveRuntime): void {
    super.init(data);
    const cfg = this.runtime as DetectiveRuntime;
    this.mode = cfg.mode;
    this.practiceLevel = cfg.practiceLevel;
    this.onPracticeFinished = cfg.onPracticeFinished;

    this.commissions = 0;
    this.omissions = 0;
    this.totalWords = 0;
    this.hitsPerCategory = { bv: 0, h: 0, consonantes: 0 };
    this.totalPerCategory = { bv: 0, h: 0, consonantes: 0 };
    this.currentWord = undefined;
    this.wordStartTs = 0;
    this.wordResolved = false;
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
    this.buildDropZones(width, height);
    this.buildWordCard(width, height);
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

    // HUD: dos badges (correctas / errores).
    const badgeW = 76;
    const badgeH = 36;
    const gap = 8;
    const totalW = badgeW * 2 + gap;
    const startX = width - totalW - 18;
    const badgeY = 14;

    const hitsX = startX;
    const hitsBg = this.add.graphics();
    hitsBg.fillStyle(0x064e3b, 1); // emerald-900
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
    errBg.fillStyle(0x7f1d1d, 1); // red-900
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

    // Sin título de misión en el canvas — ya lo muestra el ChallengeShell HTML.
    this.updateHud();
  }

  private buildDropZones(width: number, _height: number): void {
    // Posicionamiento: tarjeta de palabra arriba (HOME y=150), drop zones
    // claramente separadas debajo (y=260-440) sin solapamiento vertical.
    const zoneW = 280;
    const zoneH = 200;
    const zoneTop = 290;
    const zoneCY = zoneTop + zoneH / 2; // 390
    const cyLeft = width / 2 - 170;
    const cyRight = width / 2 + 170;

    // Zone CORRECTA (cyan)
    this.zoneCorrect = this.makeDropZone(cyLeft, zoneCY, zoneW, zoneH, PALETTE.primary, "correct");
    this.add
      .text(cyLeft, zoneCY - zoneH / 2 + 28, "✓ CORRECTA", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "20px",
        color: PALETTE.primaryHex,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Zone ERROR (magenta)
    this.zoneError = this.makeDropZone(cyRight, zoneCY, zoneW, zoneH, PALETTE.accent, "error");
    this.add
      .text(cyRight, zoneCY - zoneH / 2 + 28, "✗ ERROR", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "20px",
        color: PALETTE.accentHex,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
  }

  private makeDropZone(
    cx: number,
    cy: number,
    w: number,
    h: number,
    color: number,
    decision: "correct" | "error",
  ): Phaser.GameObjects.Rectangle {
    // Background panel (visual)
    const bg = this.add.graphics();
    bg.fillStyle(color, 0.08);
    bg.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 16);
    bg.lineStyle(2, color, 0.5);
    bg.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 16);

    // Drop zone hit (Rectangle invisible) — origen top-left para hitArea limpia.
    const dropRect = this.add
      .rectangle(cx - w / 2, cy - h / 2, w, h, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, w, h),
        Phaser.Geom.Rectangle.Contains,
        true,
      );
    dropRect.setData("decision", decision);
    return dropRect;
  }

  private buildWordCard(width: number, _height: number): void {
    // Tarjeta de palabra ARRIBA, separada de las drop zones (que empiezan
    // en y=290). Aquí home en y=170 con altura 84 → ocupa y=128-212.
    // Ancho 240 < drop zone 280: la tarjeta entra visualmente dentro del
    // panel objetivo cuando se arrastra, sin desbordar.
    const cardW = 240;
    const cardH = 84;
    const homeX = width / 2;
    const homeY = 170;
    this.wordHomeXY = { x: homeX, y: homeY };

    // Etiqueta sutil "Palabra a clasificar" arriba de la tarjeta
    this.add
      .text(homeX, homeY - cardH / 2 - 16, "PALABRA A CLASIFICAR", {
        fontFamily: "Orbitron, system-ui, sans-serif",
        fontSize: "11px",
        color: PALETTE.textMuted,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const card = this.add
      .rectangle(homeX, homeY, cardW, cardH, PALETTE.surface, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, PALETTE.primary)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.wordCard = card;
    this.wordCard.setDepth(50);

    this.wordText = this.add
      .text(homeX, homeY, "", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "34px",
        color: PALETTE.textLight,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(51);
  }

  private buildMascot(_width: number, height: number): void {
    // El sprite del astronauta es 512x512 con ~60% de padding transparente
    // alrededor de la figura. displaySize 240 compensa para que el astronauta
    // visible (la figura central) se aprecie como compañero claro.
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
      .text(bubbleX + bubbleW / 2, bubbleY, "AURA en línea. Clasifica la palabra.", {
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
        if (this.wordResolved || gameObject !== this.wordCard) return;
        this.sound.play(SOUND_PICKUP, { volume: 0.15 });
      },
    );

    this.input.on(
      "drag",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number,
      ) => {
        if (gameObject !== this.wordCard) return;
        this.wordCard?.setPosition(dragX, dragY);
        this.wordText?.setPosition(dragX, dragY);
      },
    );

    this.input.on(
      "drop",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropZone: Phaser.GameObjects.GameObject,
      ) => {
        if (gameObject !== this.wordCard || this.wordResolved) return;
        const decision = (dropZone as Phaser.GameObjects.Rectangle).getData("decision") as
          | "correct"
          | "error"
          | undefined;
        if (!decision) return;
        this.evaluateDecision(decision);
      },
    );

    this.input.on(
      "dragend",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropped: boolean,
      ) => {
        if (gameObject !== this.wordCard) return;
        // Si no fue dropped en una zona y no se resolvió, vuelve a casa.
        if (!dropped && !this.wordResolved && this.wordHomeXY) {
          const { x, y } = this.wordHomeXY;
          this.tweens.add({
            targets: this.wordCard,
            x,
            y,
            duration: 200,
            ease: "Sine.out",
            onUpdate: () => {
              if (this.wordCard && this.wordText) {
                this.wordText.setPosition(this.wordCard.x, this.wordCard.y);
              }
            },
          });
        }
      },
    );
  }

  private evaluateDecision(decision: "correct" | "error"): void {
    if (!this.currentWord || this.wordResolved) return;
    this.wordResolved = true;
    this.wordTimer?.remove();
    this.wordTimer = undefined;

    const isHit =
      (decision === "correct" && this.currentWord.isCorrect) ||
      (decision === "error" && !this.currentWord.isCorrect);
    const rt = Date.now() - this.wordStartTs;

    if (isHit) {
      this.hitsPerCategory[this.currentWord.pair.category] += 1;
      this.recordHit(rt, {
        type: "hit",
        decision,
        category: this.currentWord.pair.category,
        shown: this.currentWord.shown,
      });
      this.flashFeedback("ACIERTO", PALETTE.correct);
      this.setMascotText(
        this.currentWord.isCorrect
          ? "Confirmado: la palabra está bien escrita."
          : `Detectado: regla ${this.currentWord.pair.rule}.`,
      );
      this.sound.play(SOUND_CORRECT, { volume: 0.4 });
    } else {
      this.commissions += 1;
      this.recordError(rt, {
        type: "miss",
        decision,
        category: this.currentWord.pair.category,
        shown: this.currentWord.shown,
      });
      this.flashFeedback("FALLO", PALETTE.wrong);
      this.setMascotText(
        this.currentWord.isCorrect
          ? "Negativo. Esta palabra estaba bien escrita."
          : `Negativo. Tenía un error de ${this.currentWord.pair.rule}.`,
      );
      this.sound.play(SOUND_WRONG, { volume: 0.4 });
    }
    this.updateHud();
    this.time.delayedCall(900, () => this.resolveWord?.());
  }

  // ---------------- Diagnostic ----------------

  private async runDiagnostic(): Promise<void> {
    this.currentTimeoutMs = DIAGNOSTIC.wordTimeoutMs;
    const words = this.generateWords(
      DIAGNOSTIC.totalWords,
      DIAGNOSTIC.correctCount / DIAGNOSTIC.totalWords,
      DIAGNOSTIC.categories,
    );
    this.totalWords = words.length;

    for (const w of words) {
      if (this.ended) break;
      await this.presentWord(w);
    }

    if (!this.ended) this.endChallenge();
  }

  protected override getEndMetadata(): Record<string, unknown> | undefined {
    if (this.mode !== "diagnostic") return undefined;
    const meanRTms =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;
    const meta: DetectiveOrtograficoMeta = {
      phase: "diagnostic",
      totalWords: this.totalWords,
      hits: this.hits,
      errors: this.commissions,
      omissions: this.omissions,
      meanRTms,
      perCategory: {
        bv: { hits: this.hitsPerCategory.bv, total: this.totalPerCategory.bv },
        h: { hits: this.hitsPerCategory.h, total: this.totalPerCategory.h },
        consonantes: {
          hits: this.hitsPerCategory.consonantes,
          total: this.totalPerCategory.consonantes,
        },
      },
    };
    return meta as unknown as Record<string, unknown>;
  }

  // ---------------- Practice ----------------

  private async runPractice(level: PracticeLevel): Promise<void> {
    const cfg = PRACTICE_LEVELS[level];
    if (cfg.type === "word") {
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

  private async runRound(cfg: WordRound): Promise<void> {
    this.currentTimeoutMs = cfg.wordTimeoutMs;
    const words = this.generateWords(cfg.totalWords, cfg.correctRatio, cfg.categories);
    this.totalWords += words.length;
    for (const w of words) {
      if (this.ended) break;
      await this.presentWord(w);
    }
  }

  private async runComposite(cfg: CompositeRound): Promise<void> {
    for (const round of cfg.rounds) {
      if (this.ended) break;
      await this.runRound(round);
    }
  }

  // ---------------- Word generation ----------------

  private generateWords(
    n: number,
    correctRatio: number,
    categories: readonly WordCategory[],
  ): WordInstance[] {
    const candidates = WORD_BANK.filter((p) => categories.includes(p.category));
    if (candidates.length === 0) return [];
    const correctN = Math.round(n * correctRatio);
    const incorrectN = n - correctN;
    const list: WordInstance[] = [];
    const shuffle = <T,>(arr: T[]): T[] => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const a = out[i];
        const b = out[j];
        if (a !== undefined && b !== undefined) {
          out[i] = b;
          out[j] = a;
        }
      }
      return out;
    };
    const pool = shuffle([...candidates]);
    for (let i = 0; i < correctN; i++) {
      const pair = pool[i % pool.length];
      if (!pair) continue;
      list.push({ pair, shown: pair.correct, isCorrect: true });
    }
    for (let i = 0; i < incorrectN; i++) {
      const pair = pool[(correctN + i) % pool.length];
      if (!pair) continue;
      list.push({ pair, shown: pair.incorrect, isCorrect: false });
    }
    return shuffle(list);
  }

  // ---------------- Word presentation ----------------

  private presentWord(word: WordInstance): Promise<void> {
    return new Promise<void>((resolve) => {
      this.currentWord = word;
      this.wordResolved = false;
      this.wordStartTs = Date.now();
      // Tracking per-categoría: cada palabra presentada cuenta para su categoría.
      this.totalPerCategory[word.pair.category] += 1;
      this.updateWordCard(word.shown);
      this.setMascotText("Clasifica esta palabra…");

      this.resolveWord = () => {
        this.resolveWord = undefined;
        resolve();
      };

      this.wordTimer?.remove();
      this.wordTimer = this.time.delayedCall(this.currentTimeoutMs, () => {
        if (this.wordResolved || this.ended) return;
        this.wordResolved = true;
        this.omissions += 1;
        this.emitTelemetry("user_response", {
          correct: false,
          type: "omission",
          category: word.pair.category,
        });
        this.flashFeedback("TIEMPO", PALETTE.warning);
        this.setMascotText("Tiempo agotado.");
        this.time.delayedCall(800, () => this.resolveWord?.());
      });
    });
  }

  private updateWordCard(shown: string): void {
    if (!this.wordCard || !this.wordText || !this.wordHomeXY) return;
    this.wordText.setText(shown);
    const { x, y } = this.wordHomeXY;
    this.wordCard.setPosition(x, y);
    this.wordText.setPosition(x, y);
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
    this.hudErrorsText?.setText(`✗ ${this.commissions}`);
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
