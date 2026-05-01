import * as Phaser from "phaser";
import { BaseScene, type BaseSceneRuntimeConfig } from "@iidta/core/engine/scenes";
import {
  DIAGNOSTIC,
  DISTRACTOR_LETTERS,
  PALETTE,
  PRACTICE_LEVELS,
  TARGET_LETTER,
  type CompositeRound,
  type LetterHuntRound,
  type PracticeLevel,
  type WordHuntRound,
} from "./config";
import { ASSETS } from "./assets";
import type { CazaDeLetrasEspejoMeta } from "./rubric";

export interface CazaDeLetrasEspejoRuntime extends BaseSceneRuntimeConfig {
  mode: "diagnostic" | "practice";
  practiceLevel?: PracticeLevel;
  /** Notificación al React parent cuando termina práctica (no llama onComplete del manifest). */
  onPracticeFinished?: (summary: { hits: number; errors: number; meanRTms: number }) => void;
}

interface LetterStimulus {
  letter: string;
  isTarget: boolean;
}

const SOUND_CLICK = "iidta:click";
const SOUND_CORRECT = "iidta:correct";
const SOUND_WRONG = "iidta:wrong";
const SOUND_LEVELUP = "iidta:levelup";

export class CazaDeLetrasEspejoScene extends BaseScene {
  private mode: "diagnostic" | "practice" = "diagnostic";
  private practiceLevel?: PracticeLevel;
  private onPracticeFinished?: (s: { hits: number; errors: number; meanRTms: number }) => void;

  private commissions = 0;
  private omissions = 0;
  private targetCount = 0;
  private distractorCount = 0;
  private hasRespondedToCurrent = false;
  private stimulusStartTs = 0;
  private currentStimulusObj?: Phaser.GameObjects.Text | Phaser.GameObjects.Container;
  private feedbackOverlay?: Phaser.GameObjects.Rectangle;
  private hudText?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "CazaDeLetrasEspejoScene" });
  }

  override init(data?: CazaDeLetrasEspejoRuntime): void {
    super.init(data);
    // BaseScene ya resolvió el runtime correcto en this.runtime; sólo
    // narrowmos al tipo del reto para acceder a mode/practiceLevel.
    const cfg = this.runtime as CazaDeLetrasEspejoRuntime;
    this.mode = cfg.mode;
    this.practiceLevel = cfg.practiceLevel;
    this.onPracticeFinished = cfg.onPracticeFinished;

    this.commissions = 0;
    this.omissions = 0;
    this.targetCount = 0;
    this.distractorCount = 0;
    this.hasRespondedToCurrent = false;
    this.stimulusStartTs = 0;
  }

  preload(): void {
    this.load.audio(SOUND_CLICK, ASSETS.sounds.click);
    this.load.audio(SOUND_CORRECT, ASSETS.sounds.correct);
    this.load.audio(SOUND_WRONG, ASSETS.sounds.wrong);
    this.load.audio(SOUND_LEVELUP, ASSETS.sounds.levelUp);
  }

  override create(): void {
    super.create();

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.bgHex).setOrigin(0);
    this.feedbackOverlay = this.add.rectangle(0, 0, width, height, PALETTE.bgHex, 0).setOrigin(0);

    this.hudText = this.add
      .text(width - 16, 16, "", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "16px",
        color: PALETTE.textDark,
      })
      .setOrigin(1, 0);
    this.updateHud();

    if (this.mode === "diagnostic") {
      void this.runDiagnostic();
    } else if (this.practiceLevel != null) {
      void this.runPractice(this.practiceLevel);
    }
  }

  private updateHud(): void {
    if (!this.hudText) return;
    const label =
      this.mode === "diagnostic"
        ? `Aciertos: ${this.hits}    Errores: ${this.commissions}`
        : `Nivel ${this.practiceLevel}    Aciertos: ${this.hits}    Errores: ${this.errors}`;
    this.hudText.setText(label);
  }

  // ---------------- Diagnostic ----------------

  private async runDiagnostic(): Promise<void> {
    const stimuli = this.generateLetterStimuli(DIAGNOSTIC.targetCount, DIAGNOSTIC.distractorCount);
    this.targetCount = DIAGNOSTIC.targetCount;
    this.distractorCount = DIAGNOSTIC.distractorCount;

    for (const s of stimuli) {
      if (this.ended) break;
      await this.presentLetterStimulus(s, DIAGNOSTIC.intervalMs, /* rotated */ false);
    }

    if (!this.ended) this.endChallenge();
  }

  /**
   * Devuelve la metadata diagnóstica que la rúbrica necesita. BaseScene la
   * inyecta en raw.metadata tanto si endChallenge se dispara por safety
   * timer como por terminación natural del loop.
   */
  protected override getEndMetadata(): Record<string, unknown> | undefined {
    if (this.mode !== "diagnostic") return undefined;

    const meanRTms =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;

    const meta: CazaDeLetrasEspejoMeta = {
      phase: "diagnostic",
      targetCount: this.targetCount,
      distractorCount: this.distractorCount,
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
    if (cfg.type === "letter-hunt") {
      await this.runLetterHunt(cfg);
    } else if (cfg.type === "word-hunt") {
      await this.runWordHunt(cfg);
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

  private async runLetterHunt(cfg: LetterHuntRound): Promise<void> {
    const targets = Math.round(cfg.totalStimuli * cfg.targetRatio);
    const distractors = cfg.totalStimuli - targets;
    const stimuli = this.generateLetterStimuli(
      targets,
      distractors,
      DISTRACTOR_LETTERS.slice(0, cfg.distractorCount),
    );
    this.targetCount += targets;
    this.distractorCount += distractors;

    for (const s of stimuli) {
      if (this.ended) break;
      await this.presentLetterStimulus(s, cfg.intervalMs, cfg.rotationDeg !== 0);
    }
  }

  private async runWordHunt(cfg: WordHuntRound): Promise<void> {
    for (const word of cfg.words) {
      if (this.ended) break;
      await this.presentWord(word, cfg.targetLetter, 4500);
    }
  }

  private async runComposite(cfg: CompositeRound): Promise<void> {
    for (const round of cfg.rounds) {
      if (this.ended) break;
      if (round.type === "letter-hunt") {
        await this.runLetterHunt(round);
      } else if (round.type === "word-hunt") {
        await this.runWordHunt(round);
      }
    }
  }

  // ---------------- Letter stimulus presentation ----------------

  private generateLetterStimuli(
    targets: number,
    distractors: number,
    distractorPool: readonly string[] = DISTRACTOR_LETTERS,
  ): LetterStimulus[] {
    const list: LetterStimulus[] = [];
    for (let i = 0; i < targets; i++) list.push({ letter: TARGET_LETTER, isTarget: true });
    for (let i = 0; i < distractors; i++) {
      const ch = distractorPool[i % distractorPool.length];
      list.push({ letter: ch ?? "d", isTarget: false });
    }
    // Fisher-Yates shuffle
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

  private presentLetterStimulus(
    s: LetterStimulus,
    intervalMs: number,
    rotated: boolean,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.currentStimulusObj?.destroy();
      const { width, height } = this.scale;
      const text = this.add
        .text(width / 2, height / 2, s.letter, {
          fontFamily: "Fredoka, system-ui, sans-serif",
          fontSize: `${DIAGNOSTIC.letterSize}px`,
          color: PALETTE.textDark,
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      if (rotated) text.setAngle(180);

      this.currentStimulusObj = text;
      this.stimulusStartTs = Date.now();
      this.hasRespondedToCurrent = false;

      text.on("pointerdown", () => this.handleLetterResponse(s));

      this.time.delayedCall(intervalMs, () => {
        if (!this.hasRespondedToCurrent && s.isTarget) {
          this.omissions += 1;
          this.emitTelemetry("user_response", {
            correct: false,
            type: "omission",
            letter: s.letter,
          });
        }
        text.destroy();
        if (this.currentStimulusObj === text) this.currentStimulusObj = undefined;
        resolve();
      });
    });
  }

  private handleLetterResponse(s: LetterStimulus): void {
    if (this.hasRespondedToCurrent || this.ended) return;
    this.hasRespondedToCurrent = true;
    const rt = Date.now() - this.stimulusStartTs;

    if (s.isTarget) {
      this.recordHit(rt, { type: "hit", letter: s.letter });
      this.flash(PALETTE.correct);
      this.sound.play(SOUND_CORRECT, { volume: 0.4 });
    } else {
      this.commissions += 1;
      this.recordError(rt, { type: "commission", letter: s.letter });
      this.flash(PALETTE.wrong);
      this.sound.play(SOUND_WRONG, { volume: 0.4 });
    }
    this.updateHud();
  }

  // ---------------- Word stimulus presentation ----------------

  private presentWord(word: string, target: string, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentStimulusObj?.destroy();
      const { width, height } = this.scale;
      const letterSize = 80;
      const letterSpacing = 90;
      const totalWidth = (word.length - 1) * letterSpacing;

      const container = this.add.container(width / 2, height / 2);
      this.currentStimulusObj = container;
      let resolved = false;
      this.hasRespondedToCurrent = false;
      this.stimulusStartTs = Date.now();

      word.split("").forEach((ch, i) => {
        const x = i * letterSpacing - totalWidth / 2;
        const t = this.add
          .text(x, 0, ch, {
            fontFamily: "Fredoka, system-ui, sans-serif",
            fontSize: `${letterSize}px`,
            color: PALETTE.textDark,
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });
        t.on("pointerdown", () => {
          if (this.hasRespondedToCurrent || this.ended) return;
          this.hasRespondedToCurrent = true;
          const rt = Date.now() - this.stimulusStartTs;
          if (ch === target) {
            this.recordHit(rt, { type: "word-hit", word, letter: ch });
            this.flash(PALETTE.correct);
            this.sound.play(SOUND_CORRECT, { volume: 0.4 });
            t.setColor(PALETTE.textLight);
            t.setBackgroundColor("#10B981");
          } else {
            this.commissions += 1;
            this.recordError(rt, { type: "word-commission", word, letter: ch });
            this.flash(PALETTE.wrong);
            this.sound.play(SOUND_WRONG, { volume: 0.4 });
          }
          this.updateHud();
        });
        container.add(t);
      });

      this.time.delayedCall(durationMs, () => {
        if (resolved) return;
        resolved = true;
        if (!this.hasRespondedToCurrent && word.includes(target)) {
          this.omissions += 1;
        }
        container.destroy();
        if (this.currentStimulusObj === container) this.currentStimulusObj = undefined;
        resolve();
      });
    });
  }

  // ---------------- Visual feedback ----------------

  private flash(color: number): void {
    if (!this.feedbackOverlay) return;
    this.feedbackOverlay.setFillStyle(color, 0.25);
    this.tweens.add({
      targets: this.feedbackOverlay,
      fillAlpha: 0,
      duration: 250,
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
