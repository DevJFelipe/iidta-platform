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

export interface PracticeSummary {
  hits: number;
  errors: number;
  meanRTms: number;
  /**
   * Estrellas (1-3) según accuracy = hits / (hits + errors). Solo refuerzo
   * motivacional, NO afecta el puntaje Likert.
   */
  stars: 1 | 2 | 3;
}

export interface CazaDeLetrasEspejoRuntime extends BaseSceneRuntimeConfig {
  mode: "diagnostic" | "practice";
  practiceLevel?: PracticeLevel;
  /** Notificación al React parent cuando termina práctica (no llama onComplete del manifest). */
  onPracticeFinished?: (summary: PracticeSummary) => void;
}

interface LetterStimulus {
  letter: string;
  isTarget: boolean;
}

const SOUND_CLICK = "iidta:click";
const SOUND_CORRECT = "iidta:correct";
const SOUND_WRONG = "iidta:wrong";
const SOUND_LEVELUP = "iidta:levelup";

const HEADER_HEIGHT = 80;

export class CazaDeLetrasEspejoScene extends BaseScene {
  private mode: "diagnostic" | "practice" = "diagnostic";
  private practiceLevel?: PracticeLevel;
  private onPracticeFinished?: (s: PracticeSummary) => void;

  private commissions = 0;
  private omissions = 0;
  private targetCount = 0;
  private distractorCount = 0;
  private hasRespondedToCurrent = false;
  private stimulusStartTs = 0;
  private currentStimulusObj?: Phaser.GameObjects.Text | Phaser.GameObjects.Container;
  private feedbackOverlay?: Phaser.GameObjects.Rectangle;

  // ---------------- HUD ----------------
  private timerText?: Phaser.GameObjects.Text;
  private timerBar?: Phaser.GameObjects.Graphics;
  private progressText?: Phaser.GameObjects.Text;
  private hitsBadge?: Phaser.GameObjects.Text;
  private errorsBadge?: Phaser.GameObjects.Text;
  private fixationPoint?: Phaser.GameObjects.Arc;
  private fixationTween?: Phaser.Tweens.Tween;
  private mascot?: Phaser.GameObjects.Image;
  private mascotIdleTween?: Phaser.Tweens.Tween;
  private lastEncouragementShown = -1;

  private currentStimulusIndex = 0;
  private totalStimuliPlanned = 0;
  private hudTickTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: "CazaDeLetrasEspejoScene" });
  }

  override init(data?: CazaDeLetrasEspejoRuntime): void {
    super.init(data);
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
    this.currentStimulusIndex = 0;
    this.totalStimuliPlanned = 0;
    this.lastEncouragementShown = -1;
  }

  preload(): void {
    this.load.audio(SOUND_CLICK, ASSETS.sounds.click);
    this.load.audio(SOUND_CORRECT, ASSETS.sounds.correct);
    this.load.audio(SOUND_WRONG, ASSETS.sounds.wrong);
    this.load.audio(SOUND_LEVELUP, ASSETS.sounds.levelUp);
    this.load.image("loroSabio", ASSETS.mascot);
  }

  override create(): void {
    super.create();

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.bgHex).setOrigin(0);
    this.feedbackOverlay = this.add.rectangle(0, 0, width, height, PALETTE.bgHex, 0).setOrigin(0);

    this.buildHud();
    this.buildMascot();
    this.buildFixationPoint();

    if (this.mode === "diagnostic") {
      this.totalStimuliPlanned = DIAGNOSTIC.totalStimuli;
      this.updateProgressLabel();
      void this.runDiagnostic();
    } else if (this.practiceLevel != null) {
      this.totalStimuliPlanned = this.countPracticeStimuli(this.practiceLevel);
      this.updateProgressLabel();
      void this.runPractice(this.practiceLevel);
    }
  }

  // ---------------- HUD construction ----------------

  private buildHud(): void {
    const { width } = this.scale;

    // Banda superior con bg ligeramente distinto para destacar el HUD del juego.
    this.add.rectangle(0, 0, width, HEADER_HEIGHT, 0xffffff, 0.6).setOrigin(0);
    this.add.line(0, HEADER_HEIGHT, 0, 0, width, 0, 0xe5e7eb).setOrigin(0).setLineWidth(1);

    // ⏱ timer texto + barra a la izquierda
    this.timerText = this.add
      .text(20, 14, "⏱ 0:00", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "22px",
        color: PALETTE.textDark,
        fontStyle: "600",
      })
      .setOrigin(0, 0);
    this.timerBar = this.add.graphics();
    this.drawTimerBar(0);

    // Contador "X / 60" en el centro del header
    this.progressText = this.add
      .text(width / 2, 26, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "20px",
        color: "#6B7280",
        fontStyle: "500",
      })
      .setOrigin(0.5, 0);

    // Badges aciertos / errores a la derecha. Dejamos espacio para la
    // mascota en la esquina superior derecha (buildMascot la posiciona ahí).
    this.hitsBadge = this.add
      .text(width - 200, 22, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "22px",
        color: "#059669",
        fontStyle: "700",
      })
      .setOrigin(0, 0);
    this.errorsBadge = this.add
      .text(width - 130, 22, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "22px",
        color: "#D97706",
        fontStyle: "700",
      })
      .setOrigin(0, 0);

    this.updateScoreBadges();

    // Tick que refresca timer cada 250ms.
    this.hudTickTimer = this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => this.refreshTimer(),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hudTickTimer?.remove();
      this.hudTickTimer = undefined;
    });
  }

  private drawTimerBar(progress01: number): void {
    if (!this.timerBar) return;
    const { width } = this.scale;
    const barX = 20;
    const barY = 50;
    const barW = Math.min(260, width - 360);
    const barH = 10;
    const segments = 6;

    this.timerBar.clear();
    // Track de fondo
    this.timerBar.fillStyle(0xe5e7eb, 1);
    this.timerBar.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    // Fill principal
    const fill = Math.max(0, Math.min(1, progress01)) * barW;
    if (fill > 0) {
      this.timerBar.fillStyle(PALETTE.primary, 1);
      this.timerBar.fillRoundedRect(barX, barY, fill, barH, barH / 2);
    }
    // Líneas separadoras blancas cada 1/6 (segmentación visual). El primer y
    // último borde no se dibujan porque coinciden con los extremos del track.
    this.timerBar.fillStyle(0xffffff, 0.85);
    for (let i = 1; i < segments; i++) {
      const x = barX + (barW * i) / segments - 1;
      this.timerBar.fillRect(x, barY, 2, barH);
    }
  }

  private refreshTimer(): void {
    if (!this.timerText || this.startedAt === 0) return;
    const totalSec =
      this.mode === "diagnostic" ? this.runtime.diagnosticDurationSec : this.estimatedPracticeSec();
    const elapsedSec = Math.min(totalSec, Math.floor((Date.now() - this.startedAt) / 1000));
    const remaining = Math.max(0, totalSec - elapsedSec);
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    this.timerText.setText(`⏱ ${m}:${s.toString().padStart(2, "0")}`);
    this.drawTimerBar(elapsedSec / Math.max(1, totalSec));
  }

  private updateProgressLabel(): void {
    if (!this.progressText) return;
    if (this.totalStimuliPlanned > 0) {
      this.progressText.setText(`${this.currentStimulusIndex} / ${this.totalStimuliPlanned}`);
    } else {
      this.progressText.setText("");
    }
  }

  private updateScoreBadges(): void {
    // ★ = aciertos (estrella sólida unicode), ⚠ = errores (advertencia
    // amarilla, evita rojo intenso para no penalizar visualmente al niño).
    if (this.hitsBadge) this.hitsBadge.setText(`★ ${this.hits}`);
    if (this.errorsBadge) {
      const errs = this.mode === "diagnostic" ? this.commissions : this.errors + this.commissions;
      this.errorsBadge.setText(`⚠ ${errs}`);
    }
  }

  /**
   * Fixation point estándar de paradigmas Go/No-Go. Punto único centrado
   * que pulsa durante el ISI (intervalo entre estímulos) para que el niño
   * fije la mirada antes del próximo estímulo. Reduce ruido oculomotor y
   * estabiliza los tiempos de respuesta.
   */
  private buildFixationPoint(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = (height + HEADER_HEIGHT) / 2;
    this.fixationPoint = this.add.circle(cx, cy, 6, 0x6b7280, 0.5).setVisible(false);
  }

  private async showInterlude(durationMs: number): Promise<void> {
    if (!this.fixationPoint) {
      return new Promise((r) => this.time.delayedCall(durationMs, r));
    }
    this.fixationPoint.setVisible(true).setAlpha(0.35);
    this.fixationTween = this.tweens.add({
      targets: this.fixationPoint,
      alpha: 1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
    await new Promise<void>((resolve) => this.time.delayedCall(durationMs, () => resolve()));
    this.fixationTween?.stop();
    this.fixationTween = undefined;
    this.fixationPoint.setVisible(false);
  }

  // ---------------- Mascota Loro Sabio ----------------

  private buildMascot(): void {
    if (!this.textures.exists("loroSabio")) return;
    const { width } = this.scale;
    const x = width - 50;
    const y = HEADER_HEIGHT + 50;
    this.mascot = this.add
      .image(x, y, "loroSabio")
      .setDisplaySize(60, 60)
      .setOrigin(0.5);
    // Idle bobbing suave para que el niño sepa que la mascota está "viva"
    // sin distraer del estímulo central.
    this.mascotIdleTween = this.tweens.add({
      targets: this.mascot,
      y: y - 4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  /** Asentir / saltito al acertar. Refuerzo positivo discreto. */
  private mascotCelebrate(): void {
    if (!this.mascot) return;
    this.tweens.add({
      targets: this.mascot,
      scale: { from: this.mascot.scaleX, to: this.mascot.scaleX * 1.15 },
      duration: 110,
      yoyo: true,
      ease: "Quad.out",
    });
    this.tweens.add({
      targets: this.mascot,
      angle: { from: -6, to: 6 },
      duration: 90,
      yoyo: true,
      repeat: 1,
      ease: "Sine.inOut",
      onComplete: () => this.mascot?.setAngle(0),
    });
  }

  // ---------------- Mensajes de aliento ----------------

  private maybeShowEncouragement(): void {
    // Mostrar tras cada 15 estímulos completados, una sola vez por umbral.
    const milestone = Math.floor(this.currentStimulusIndex / 15);
    if (milestone <= 0 || milestone === this.lastEncouragementShown) return;
    if (this.currentStimulusIndex >= this.totalStimuliPlanned) return;
    this.lastEncouragementShown = milestone;

    // Copy según porcentaje del total (más natural que mapear a constantes).
    const ratio = this.currentStimulusIndex / Math.max(1, this.totalStimuliPlanned);
    let msg = "¡Vas muy bien!";
    if (ratio >= 0.45 && ratio < 0.6) msg = "¡La mitad!";
    else if (ratio >= 0.6) msg = "¡Casi terminas!";

    const { width } = this.scale;
    const text = this.add
      .text(width / 2, HEADER_HEIGHT + 30, msg, {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "26px",
        color: "#10B981",
        fontStyle: "700",
      })
      .setOrigin(0.5, 0)
      .setAlpha(0)
      .setScale(0.9);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1,
      duration: 200,
      ease: "Back.out",
      onComplete: () => {
        this.time.delayedCall(1600, () => {
          this.tweens.add({
            targets: text,
            alpha: 0,
            duration: 200,
            ease: "Sine.in",
            onComplete: () => text.destroy(),
          });
        });
      },
    });
  }

  // ---------------- Intro countdown ----------------

  /**
   * Beep sintético tipo "lights out" de F1 / Mario Kart. Generado vía
   * Web Audio API para no requerir assets nuevos. 3-2-1 en A4 corto, ¡YA!
   * en E5 más largo y suave en decay (efecto "GO!").
   */
  private playCountdownBeep(isFinal: boolean): void {
    const sm = this.sound as unknown as { context?: AudioContext };
    const ctx = sm.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = isFinal ? 0.55 : 0.18;
    const freq = isFinal ? 660 : 440;
    const vol = isFinal ? 0.5 : 0.32;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    if (isFinal) {
      // Pequeño slide hacia arriba para reforzar el "¡YA!".
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
  }

  private async runIntroCountdown(): Promise<void> {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2 + 20;
    const steps: Array<{ label: string; color: string; final: boolean }> = [
      { label: "3", color: "#0F172A", final: false },
      { label: "2", color: "#0F172A", final: false },
      { label: "1", color: "#0F172A", final: false },
      { label: "¡YA!", color: "#10B981", final: true },
    ];
    for (const step of steps) {
      this.playCountdownBeep(step.final);
      const t = this.add
        .text(cx, cy, step.label, {
          fontFamily: "Fredoka, system-ui, sans-serif",
          fontSize: step.label === "¡YA!" ? "120px" : "180px",
          color: step.color,
          fontStyle: "700",
        })
        .setOrigin(0.5)
        .setScale(0.4)
        .setAlpha(0);
      this.tweens.add({
        targets: t,
        scale: 1.1,
        alpha: 1,
        duration: 220,
        ease: "Back.out",
      });
      await new Promise<void>((resolve) =>
        this.time.delayedCall(550, () => {
          this.tweens.add({
            targets: t,
            scale: 1.5,
            alpha: 0,
            duration: 200,
            ease: "Sine.in",
            onComplete: () => {
              t.destroy();
              resolve();
            },
          });
        }),
      );
    }
  }

  // ---------------- Diagnostic ----------------

  private async runDiagnostic(): Promise<void> {
    await this.runIntroCountdown();
    if (this.ended) return;

    // Sincroniza HUD timer + safety net con el inicio real de la fase activa.
    // El countdown (~3s) NO debe consumir tiempo del paradigma psicométrico.
    this.restartActiveClock();

    const stimuli = this.generateLetterStimuli(DIAGNOSTIC.targetCount, DIAGNOSTIC.distractorCount);
    this.targetCount = DIAGNOSTIC.targetCount;
    this.distractorCount = DIAGNOSTIC.distractorCount;

    for (const s of stimuli) {
      if (this.ended) break;
      await this.presentLetterStimulus(s, DIAGNOSTIC.intervalMs, /* rotated */ false);
    }

    if (!this.ended) this.endChallenge();
  }

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
    await this.runIntroCountdown();
    if (this.ended) return;

    // Sincroniza HUD timer con el inicio real de la fase de práctica
    // (post-countdown). En práctica no hay safety timer porque no es
    // diagnosticMode, pero igual queremos el reloj alineado.
    this.restartActiveClock();

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
    const errors = this.errors + this.commissions;
    const totalAttempts = this.hits + errors;
    const accuracy = totalAttempts > 0 ? this.hits / totalAttempts : 0;
    // Stars motivacionales — NO afectan el puntaje Likert (que solo se calcula
    // en fase diagnóstica). Sirven solo como refuerzo positivo.
    const stars: 1 | 2 | 3 = accuracy >= 0.8 ? 3 : accuracy >= 0.5 ? 2 : 1;
    this.onPracticeFinished?.({
      hits: this.hits,
      errors,
      meanRTms,
      stars,
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
      await this.presentWord(word, cfg.targetLetter, 3500);
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

  private countPracticeStimuli(level: PracticeLevel): number {
    const cfg = PRACTICE_LEVELS[level];
    if (cfg.type === "letter-hunt") return cfg.totalStimuli;
    if (cfg.type === "word-hunt") return cfg.words.length;
    return cfg.rounds.reduce(
      (acc, r) => acc + (r.type === "letter-hunt" ? r.totalStimuli : r.words.length),
      0,
    );
  }

  private estimatedPracticeSec(): number {
    if (this.practiceLevel == null) return 0;
    const cfg = PRACTICE_LEVELS[this.practiceLevel];
    if (cfg.type === "letter-hunt") return Math.ceil((cfg.intervalMs * cfg.totalStimuli) / 1000);
    if (cfg.type === "word-hunt") return Math.ceil((3500 * cfg.words.length) / 1000);
    return cfg.rounds.reduce(
      (acc, r) =>
        acc +
        (r.type === "letter-hunt"
          ? Math.ceil((r.intervalMs * r.totalStimuli) / 1000)
          : Math.ceil((3500 * r.words.length) / 1000)),
      0,
    );
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

  /**
   * Cada estímulo se compone de:
   * 1. Animación de entrada (scale-bounce + fade-in) ~250ms
   * 2. Ventana activa donde el usuario puede responder (intervalMs - in - out - interlude)
   * 3. Animación de salida (fade + scale-down) ~200ms
   * 4. Interludio con dots animados (~250ms) que avisa que viene la siguiente
   */
  private presentLetterStimulus(
    s: LetterStimulus,
    intervalMs: number,
    rotated: boolean,
  ): Promise<void> {
    return new Promise((resolve) => {
      this.currentStimulusObj?.destroy();
      const { width, height } = this.scale;
      this.currentStimulusIndex += 1;
      this.updateProgressLabel();

      const showCenterY = (height + HEADER_HEIGHT) / 2;
      const text = this.add
        .text(width / 2, showCenterY, s.letter, {
          fontFamily: "Fredoka, system-ui, sans-serif",
          fontSize: `${DIAGNOSTIC.letterSize}px`,
          color: PALETTE.textDark,
          fontStyle: "700",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScale(0)
        .setAlpha(0);

      if (rotated) text.setAngle(180);

      this.currentStimulusObj = text;
      this.hasRespondedToCurrent = false;

      // Entrada: scale-bounce + fade-in.
      this.tweens.add({
        targets: text,
        scale: 1,
        alpha: 1,
        duration: 240,
        ease: "Back.out",
        onComplete: () => {
          this.stimulusStartTs = Date.now();
        },
      });

      text.on("pointerdown", () => this.handleLetterResponse(s, text));

      // Ventana activa = intervalMs - tiempos de transición. Mantengo intervalMs
      // total psicométricamente porque generateLetterStimuli + countdown ya lo
      // contemplan, pero recortamos espacio para entrada/salida/interlude.
      const enterMs = 240;
      const exitMs = 200;
      const interludeMs = 280;
      const activeMs = Math.max(400, intervalMs - enterMs - exitMs - interludeMs);

      this.time.delayedCall(enterMs + activeMs, () => {
        if (!this.hasRespondedToCurrent && s.isTarget) {
          this.omissions += 1;
          this.emitTelemetry("user_response", {
            correct: false,
            type: "omission",
            letter: s.letter,
          });
        }
        // Salida.
        this.tweens.add({
          targets: text,
          alpha: 0,
          scale: 0.7,
          duration: exitMs,
          ease: "Sine.in",
          onComplete: () => {
            text.destroy();
            if (this.currentStimulusObj === text) this.currentStimulusObj = undefined;
            this.maybeShowEncouragement();
            void this.showInterlude(interludeMs).then(() => resolve());
          },
        });
      });
    });
  }

  private handleLetterResponse(
    s: LetterStimulus,
    target: Phaser.GameObjects.Text,
  ): void {
    if (this.hasRespondedToCurrent || this.ended) return;
    this.hasRespondedToCurrent = true;
    const rt = Date.now() - this.stimulusStartTs;

    if (s.isTarget) {
      this.recordHit(rt, { type: "hit", letter: s.letter });
      this.flash(PALETTE.correct);
      this.sound.play(SOUND_CORRECT, { volume: 0.4 });
      this.popupScore(target.x, target.y, true);
      this.bumpStimulus(target, 1.18);
      this.mascotCelebrate();
    } else {
      this.commissions += 1;
      this.recordError(rt, { type: "commission", letter: s.letter });
      this.flash(PALETTE.wrong);
      this.sound.play(SOUND_WRONG, { volume: 0.4 });
      this.popupScore(target.x, target.y, false);
      this.shakeStimulus(target);
    }
    this.updateScoreBadges();
  }

  private bumpStimulus(target: Phaser.GameObjects.GameObject, peak: number): void {
    const obj = target as Phaser.GameObjects.Text;
    this.tweens.add({
      targets: obj,
      scale: peak,
      duration: 110,
      yoyo: true,
      ease: "Quad.out",
    });
  }

  private shakeStimulus(target: Phaser.GameObjects.GameObject): void {
    const obj = target as Phaser.GameObjects.Text;
    const baseX = obj.x;
    const baseColor = obj.style.color;
    obj.setColor("#DC2626");
    this.tweens.add({
      targets: obj,
      x: baseX + 12,
      duration: 60,
      yoyo: true,
      repeat: 2,
      ease: "Sine.inOut",
      onComplete: () => {
        obj.setX(baseX);
        obj.setColor(baseColor);
      },
    });
  }

  private popupScore(x: number, y: number, isHit: boolean): void {
    const label = isHit ? "+1" : "✗";
    const color = isHit ? "#10B981" : "#DC2626";
    const popup = this.add
      .text(x, y - 80, label, {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "56px",
        color,
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.6);
    this.tweens.add({
      targets: popup,
      alpha: 1,
      scale: 1,
      duration: 160,
      ease: "Back.out",
      onComplete: () => {
        this.tweens.add({
          targets: popup,
          y: popup.y - 80,
          alpha: 0,
          duration: 700,
          ease: "Sine.out",
          onComplete: () => popup.destroy(),
        });
      },
    });
  }

  // ---------------- Word stimulus presentation ----------------

  private presentWord(word: string, target: string, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentStimulusObj?.destroy();
      const { width, height } = this.scale;
      this.currentStimulusIndex += 1;
      this.updateProgressLabel();

      const letterSize = 80;
      const letterSpacing = 90;
      const totalWidth = (word.length - 1) * letterSpacing;

      const showCenterY = (height + HEADER_HEIGHT) / 2;
      const container = this.add.container(width / 2, showCenterY).setScale(0).setAlpha(0);
      this.currentStimulusObj = container;
      let resolved = false;
      this.hasRespondedToCurrent = false;

      word.split("").forEach((ch, i) => {
        const x = i * letterSpacing - totalWidth / 2;
        const t = this.add
          .text(x, 0, ch, {
            fontFamily: "Fredoka, system-ui, sans-serif",
            fontSize: `${letterSize}px`,
            color: PALETTE.textDark,
            fontStyle: "700",
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
            this.popupScore(container.x + x, container.y, true);
          } else {
            this.commissions += 1;
            this.recordError(rt, { type: "word-commission", word, letter: ch });
            this.flash(PALETTE.wrong);
            this.sound.play(SOUND_WRONG, { volume: 0.4 });
            this.popupScore(container.x + x, container.y, false);
          }
          this.updateScoreBadges();
        });
        container.add(t);
      });

      this.tweens.add({
        targets: container,
        scale: 1,
        alpha: 1,
        duration: 260,
        ease: "Back.out",
        onComplete: () => {
          this.stimulusStartTs = Date.now();
        },
      });

      this.time.delayedCall(durationMs - 200, () => {
        if (resolved) return;
        resolved = true;
        if (!this.hasRespondedToCurrent && word.includes(target)) {
          this.omissions += 1;
        }
        this.tweens.add({
          targets: container,
          alpha: 0,
          scale: 0.7,
          duration: 200,
          ease: "Sine.in",
          onComplete: () => {
            container.destroy();
            if (this.currentStimulusObj === container) this.currentStimulusObj = undefined;
            void this.showInterlude(280).then(() => resolve());
          },
        });
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
