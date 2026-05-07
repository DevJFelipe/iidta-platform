import * as Phaser from "phaser";
import { BaseScene, type BaseSceneRuntimeConfig } from "@iidta/core/engine/scenes";
import {
  DIAGNOSTIC,
  PALETTE,
  PRACTICE_LEVELS,
  PRODUCTS_BANK,
  type CoinValue,
  type CompositeRound,
  type PracticeLevel,
  type Product,
  type ProblemRound,
} from "./config";
import { ASSETS } from "./assets";
import type { MercadoMatematicoMeta } from "./rubric";

export interface MercadoRuntime extends BaseSceneRuntimeConfig {
  mode: "diagnostic" | "practice";
  practiceLevel?: PracticeLevel;
  onPracticeFinished?: (summary: { hits: number; errors: number; meanRTms: number }) => void;
}

interface ProblemInstance {
  product: Product;
}

const KEY_MASCOT = "iidta:rabbit";
const SOUND_COIN = "iidta:coin";
const SOUND_CORRECT = "iidta:correct";
const SOUND_WRONG = "iidta:wrong";
const SOUND_LEVELUP = "iidta:levelup";

export class MercadoMatematicoScene extends BaseScene {
  private mode: "diagnostic" | "practice" = "diagnostic";
  private practiceLevel?: PracticeLevel;
  private onPracticeFinished?: (s: { hits: number; errors: number; meanRTms: number }) => void;

  // Stats
  private commissions = 0; // errores de pago (suma incorrecta)
  private omissions = 0; // problemas no resueltos en tiempo
  private totalProblems = 0;

  // Current problem state
  private currentProblem?: ProblemInstance;
  private problemStartTs = 0;
  private problemTimer?: Phaser.Time.TimerEvent;
  private currentCoins: readonly CoinValue[] = DIAGNOSTIC.coins;
  private currentTimeoutMs: number = DIAGNOSTIC.problemTimeoutMs;
  private resolveProblem?: () => void;
  private problemResolved = false;

  // Cart state
  private cartCoinValues: CoinValue[] = [];
  private cartCoinSprites: Phaser.GameObjects.Arc[] = [];

  // Visual elements
  private productCardG?: Phaser.GameObjects.Graphics;
  private productEmojiText?: Phaser.GameObjects.Text;
  private productNameText?: Phaser.GameObjects.Text;
  private productPriceText?: Phaser.GameObjects.Text;

  private cartShapeG?: Phaser.GameObjects.Graphics;
  private cartZone?: Phaser.GameObjects.Zone | Phaser.GameObjects.Rectangle;
  private cartTotalText?: Phaser.GameObjects.Text;
  private cartZoneParams?: { cx: number; cy: number; w: number; h: number };

  private payButton?: Phaser.GameObjects.Rectangle;
  private payButtonText?: Phaser.GameObjects.Text;
  private payButtonStrokeG?: Phaser.GameObjects.Graphics;
  private payButtonParams?: { cx: number; cy: number; w: number; h: number; r: number };
  private payEnabled = false;

  private hudHitsText?: Phaser.GameObjects.Text;
  private hudErrorsText?: Phaser.GameObjects.Text;
  private progressBarG?: Phaser.GameObjects.Graphics;
  private progressBarParams?: { x: number; y: number; w: number; h: number };

  private mascotImg?: Phaser.GameObjects.Image;
  private mascotText?: Phaser.GameObjects.Text;

  private feedbackText?: Phaser.GameObjects.Text;
  private feedbackOverlay?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "MercadoMatematicoScene" });
  }

  override init(data?: MercadoRuntime): void {
    super.init(data);
    const cfg = this.runtime as MercadoRuntime;
    this.mode = cfg.mode;
    this.practiceLevel = cfg.practiceLevel;
    this.onPracticeFinished = cfg.onPracticeFinished;

    this.commissions = 0;
    this.omissions = 0;
    this.totalProblems = 0;
    this.currentProblem = undefined;
    this.problemStartTs = 0;
    this.problemResolved = false;
    this.cartCoinValues = [];
    this.cartCoinSprites = [];
  }

  preload(): void {
    this.load.image(KEY_MASCOT, ASSETS.mascot);
    this.load.audio(SOUND_COIN, ASSETS.sounds.coin);
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
    this.buildProductCard(width, height);
    this.buildCart(width, height);
    this.buildCoinPool(width, height);
    this.buildPayButton(width, height);
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
    // Progress bar centrada arriba
    const barW = 320;
    const barH = 6;
    const barX = (width - barW) / 2;
    const barY = 26;
    const track = this.add.graphics();
    track.fillStyle(0xe5e7eb, 1);
    track.fillRoundedRect(barX, barY, barW, barH, barH / 2);
    this.progressBarG = this.add.graphics();
    this.progressBarParams = { x: barX, y: barY, w: barW, h: barH };

    // HUD: dos badges (verde aciertos, rojo errores)
    const badgeW = 76;
    const badgeH = 36;
    const gap = 8;
    const totalW = badgeW * 2 + gap;
    const startX = width - totalW - 18;
    const badgeY = 14;

    const hitsX = startX;
    const hitsBg = this.add.graphics();
    hitsBg.fillStyle(0xecfdf5, 1);
    hitsBg.fillRoundedRect(hitsX, badgeY, badgeW, badgeH, badgeH / 2);
    hitsBg.lineStyle(1, 0xa7f3d0, 1);
    hitsBg.strokeRoundedRect(hitsX, badgeY, badgeW, badgeH, badgeH / 2);
    this.hudHitsText = this.add
      .text(hitsX + badgeW / 2, badgeY + badgeH / 2, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "18px",
        color: PALETTE.primaryDark,
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const errX = startX + badgeW + gap;
    const errBg = this.add.graphics();
    errBg.fillStyle(0xfef2f2, 1);
    errBg.fillRoundedRect(errX, badgeY, badgeW, badgeH, badgeH / 2);
    errBg.lineStyle(1, 0xfecaca, 1);
    errBg.strokeRoundedRect(errX, badgeY, badgeW, badgeH, badgeH / 2);
    this.hudErrorsText = this.add
      .text(errX + badgeW / 2, badgeY + badgeH / 2, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "18px",
        color: "#B91C1C",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.updateHud();
  }

  private buildProductCard(width: number, _height: number): void {
    const cx = width / 2;
    const y = 92;
    const cardW = 360;
    const cardH = 96;
    const cardR = 18;

    // Sombra
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.06);
    shadow.fillRoundedRect(cx - cardW / 2 + 2, y - cardH / 2 + 4, cardW, cardH, cardR);

    this.productCardG = this.add.graphics();
    this.productCardG.fillStyle(0xffffff, 1);
    this.productCardG.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, cardR);
    this.productCardG.lineStyle(1, 0xe5e7eb, 1);
    this.productCardG.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, cardR);

    // Emoji del producto a la izquierda
    this.productEmojiText = this.add
      .text(cx - cardW / 2 + 56, y, "", {
        fontFamily: "system-ui, 'Apple Color Emoji', sans-serif",
        fontSize: "56px",
      })
      .setOrigin(0.5);

    // Nombre y precio a la derecha
    this.productNameText = this.add
      .text(cx - cardW / 2 + 110, y - 18, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "16px",
        color: "#64748b",
      })
      .setOrigin(0, 0.5);

    this.productPriceText = this.add
      .text(cx - cardW / 2 + 110, y + 14, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "32px",
        color: PALETTE.primaryDark,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
  }

  private buildCart(width: number, _height: number): void {
    const cx = width / 2;
    const cy = 232;
    const cartW = 320;
    const cartH = 130;
    const cartR = 16;

    this.cartShapeG = this.add.graphics();
    this.cartShapeG.fillStyle(PALETTE.cartLight, 1);
    this.cartShapeG.fillRoundedRect(cx - cartW / 2, cy - cartH / 2, cartW, cartH, cartR);
    this.cartShapeG.lineStyle(2, PALETTE.cart, 1);
    this.cartShapeG.strokeRoundedRect(cx - cartW / 2, cy - cartH / 2, cartW, cartH, cartR);

    // Etiqueta del carrito
    this.add
      .text(cx - cartW / 2 + 14, cy - cartH / 2 + 10, "🛒 Carrito", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "14px",
        color: PALETTE.cart === 0x065f46 ? "#065F46" : "#0F172A",
        fontStyle: "bold",
      })
      .setOrigin(0, 0);

    // Drop zone: Rectangle invisible con hitArea explícito + dropZone=true.
    // Origen TOP-LEFT (0,0) y posicionamos el rect desde la esquina para que
    // las coords del hitArea local coincidan exactamente con el área visible.
    const dropRect = this.add
      .rectangle(cx - cartW / 2, cy - cartH / 2, cartW, cartH, 0xffffff, 0)
      .setOrigin(0)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, cartW, cartH),
        Phaser.Geom.Rectangle.Contains,
        true,
      );
    this.cartZone = dropRect;
    this.cartZoneParams = { cx, cy, w: cartW, h: cartH };

    // Total
    this.cartTotalText = this.add
      .text(cx + cartW / 2 - 14, cy + cartH / 2 - 14, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "20px",
        color: PALETTE.primaryDark,
        fontStyle: "bold",
      })
      .setOrigin(1, 1);
    this.updateCartTotal();
  }

  private buildCoinPool(width: number, _height: number): void {
    // Pool de monedas en y=400. Coins disponibles según this.currentCoins.
    // En el create() inicial, this.currentCoins ya está seteado al diagnostic
    // por defecto, pero runDiagnostic/runRound lo actualiza antes del primer
    // problema. Por eso reconstruimos el pool en cada problema.
    this.refreshCoinPool(width);
  }

  private refreshCoinPool(width: number): void {
    // Eliminar pool actual (monedas-template con sus siblings) que NO estén
    // ya en el carrito.
    this.children.list
      .filter((obj) => {
        const a = obj as Phaser.GameObjects.Arc;
        return a.getData?.("isPoolTemplate") === true && !a.getData?.("isInCart");
      })
      .forEach((obj) => this.destroyCoin(obj as Phaser.GameObjects.Arc));

    const coins = this.currentCoins;
    const poolY = 408;
    const poolStartX = width / 2 - ((coins.length - 1) * 130) / 2;

    coins.forEach((value, i) => {
      const x = poolStartX + i * 130;
      this.spawnCoinTemplate(value, x, poolY);
    });
  }

  private destroyCoin(coin: Phaser.GameObjects.Arc): void {
    const sibs = coin.getData("siblings") as
      | { shadow: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }
      | undefined;
    sibs?.shadow.destroy();
    sibs?.label.destroy();
    coin.destroy();
  }

  private moveCoinAndSiblings(coin: Phaser.GameObjects.Arc, x: number, y: number): void {
    const sibs = coin.getData("siblings") as
      | { shadow: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }
      | undefined;
    coin.setPosition(x, y);
    if (sibs) {
      sibs.shadow.setPosition(x + 2, y + 4);
      sibs.label.setPosition(x, y);
    }
  }

  private spawnCoinTemplate(value: CoinValue, x: number, y: number): Phaser.GameObjects.Arc {
    // Cada moneda es un Arc (círculo) directo — NO Container — para que el
    // hit-test sea exactamente el área visible del círculo. Phaser.Arc tiene
    // hit area circular implícito que coincide con el render.
    // Los visuales auxiliares (sombra, label) son siblings y se mueven junto
    // al body via los handlers de drag, leyéndolos desde body.getData("siblings").
    const radius = 38;

    const shadow = this.add.circle(x + 2, y + 4, radius, 0x000000, 0.15);
    const body = this.add.circle(x, y, radius, PALETTE.coin).setStrokeStyle(3, PALETTE.coinDark);
    const label = this.add
      .text(x, y, `$${value}`, {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "26px",
        color: "#7C2D12",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    body.setData("value", value);
    body.setData("isPoolTemplate", true);
    body.setData("originX", x);
    body.setData("originY", y);
    body.setData("isInCart", false);
    body.setData("siblings", { shadow, label });

    body.setInteractive({ draggable: true, useHandCursor: true });
    return body;
  }

  private buildPayButton(width: number, height: number): void {
    const cx = width - 110;
    const cy = height - 60;
    const btnW = 160;
    const btnH = 56;
    const btnR = btnH / 2;

    // Graphics solo para el stroke con corner radius (visual). El hit-test
    // lo provee un Rectangle interactive con el mismo tamaño centrado.
    this.payButtonStrokeG = this.add.graphics();

    // Rectangle como botón clickeable. Pintamos el fill con su propio color
    // y dejamos el stroke al graphics encima.
    const btn = this.add
      .rectangle(cx, cy, btnW, btnH, 0xd4d4d8, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: false });
    btn.on("pointerdown", () => this.onPayClicked());
    this.payButton = btn;

    const text = this.add
      .text(cx, cy, "Pagar", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "22px",
        color: "#71717a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.payButtonText = text;

    this.payButtonParams = { cx, cy, w: btnW, h: btnH, r: btnR };
    this.setPayEnabled(false);
  }

  private setPayEnabled(enabled: boolean): void {
    if (
      !this.payButton ||
      !this.payButtonText ||
      !this.payButtonStrokeG ||
      !this.payButtonParams
    )
      return;
    this.payEnabled = enabled;
    const { cx, cy, w, h, r } = this.payButtonParams;
    this.payButtonStrokeG.clear();

    if (enabled) {
      this.payButton.setFillStyle(PALETTE.primary, 1);
      this.payButtonStrokeG.lineStyle(2, 0x047857, 1);
      this.payButtonStrokeG.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
      this.payButtonText.setColor(PALETTE.textLight);
      this.payButton.setInteractive({ useHandCursor: true });
    } else {
      this.payButton.setFillStyle(0xd4d4d8, 1);
      this.payButtonStrokeG.lineStyle(1, 0xa1a1aa, 1);
      this.payButtonStrokeG.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);
      this.payButtonText.setColor("#71717a");
      this.payButton.setInteractive({ useHandCursor: false });
    }
  }

  private buildMascot(_width: number, height: number): void {
    const mascotX = 64;
    const mascotY = height - 64;
    this.mascotImg = this.add
      .image(mascotX, mascotY, KEY_MASCOT)
      .setOrigin(0.5)
      .setDisplaySize(80, 80);

    const bubbleX = mascotX + 52;
    const bubbleY = mascotY;
    const bubbleW = 240;
    const bubbleH = 44;
    const bubbleR = 18;

    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(bubbleX, bubbleY - bubbleH / 2, bubbleW, bubbleH, bubbleR);
    g.lineStyle(1, 0xe5e7eb, 1);
    g.strokeRoundedRect(bubbleX, bubbleY - bubbleH / 2, bubbleW, bubbleH, bubbleR);
    g.fillTriangle(bubbleX, bubbleY - 6, bubbleX, bubbleY + 6, bubbleX - 8, bubbleY);

    this.mascotText = this.add
      .text(bubbleX + bubbleW / 2, bubbleY, "Arrastra monedas al carrito", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "14px",
        color: PALETTE.textDark,
      })
      .setOrigin(0.5);
  }

  private buildFeedback(width: number, height: number): void {
    this.feedbackOverlay = this.add
      .rectangle(0, 0, width, height, PALETTE.bgHex, 0)
      .setOrigin(0);
    this.feedbackText = this.add
      .text(width / 2, height / 2, "", {
        fontFamily: "Fredoka, system-ui, sans-serif",
        fontSize: "104px",
        fontStyle: "bold",
        color: PALETTE.textLight,
        stroke: "#0F172A",
        strokeThickness: 10,
        shadow: { offsetX: 0, offsetY: 6, color: "#000000", blur: 12, fill: true },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1000);
  }

  // ---------------- Drag handlers ----------------

  private attachDragHandlers(): void {
    this.input.on(
      "dragstart",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
      ) => {
        const a = gameObject as Phaser.GameObjects.Arc;
        if (this.problemResolved) return;
        if (a.getData("isPoolTemplate") === true && !a.getData("isInCart")) {
          a.setData("isPoolTemplate", false);
          const ox = a.getData("originX") as number;
          const oy = a.getData("originY") as number;
          const value = a.getData("value") as CoinValue;
          this.spawnCoinTemplate(value, ox, oy);
          // Subir profundidad del body + siblings para que queden por encima
          // del nuevo template recién spawn-eado y del resto del UI.
          const sibs = a.getData("siblings") as
            | { shadow: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }
            | undefined;
          a.setDepth(80);
          if (sibs) {
            sibs.shadow.setDepth(79);
            sibs.label.setDepth(81);
          }
        }
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
        this.moveCoinAndSiblings(gameObject as Phaser.GameObjects.Arc, dragX, dragY);
      },
    );

    this.input.on(
      "drop",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropZone: Phaser.GameObjects.GameObject,
      ) => {
        const a = gameObject as Phaser.GameObjects.Arc;
        if (dropZone === this.cartZone) {
          const value = a.getData("value") as CoinValue;
          this.addCoinToCart(a, value);
        }
      },
    );

    this.input.on(
      "dragend",
      (
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dropped: boolean,
      ) => {
        const a = gameObject as Phaser.GameObjects.Arc;
        if (!dropped && !a.getData("isInCart")) {
          this.destroyCoin(a);
        }
      },
    );
  }

  private addCoinToCart(coin: Phaser.GameObjects.Arc, value: CoinValue): void {
    if (!this.cartZoneParams) return;
    coin.setData("isInCart", true);
    this.cartCoinValues.push(value);
    this.cartCoinSprites.push(coin);

    // Reposicionar dentro del carrito en grid 6xN
    const idx = this.cartCoinValues.length - 1;
    const cols = 6;
    const slotSpacingX = 44;
    const slotSpacingY = 44;
    const startX = this.cartZoneParams.cx - ((cols - 1) * slotSpacingX) / 2;
    const slotX = startX + (idx % cols) * slotSpacingX;
    const slotY = this.cartZoneParams.cy - 8 + Math.floor(idx / cols) * slotSpacingY;

    const sibs = coin.getData("siblings") as
      | { shadow: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }
      | undefined;

    this.tweens.add({
      targets: coin,
      x: slotX,
      y: slotY,
      scale: 0.62,
      duration: 220,
      ease: "Sine.out",
      onUpdate: () => {
        if (sibs) {
          sibs.shadow.setPosition(coin.x + 2, coin.y + 4).setScale(coin.scale);
          sibs.label.setPosition(coin.x, coin.y).setScale(coin.scale);
        }
      },
    });
    coin.disableInteractive();
    this.updateCartTotal();
    this.sound.play(SOUND_COIN, { volume: 0.3 });
  }

  private clearCart(): void {
    for (const c of this.cartCoinSprites) this.destroyCoin(c);
    this.cartCoinSprites = [];
    this.cartCoinValues = [];
    this.updateCartTotal();
  }

  private updateCartTotal(): void {
    const total = this.cartCoinValues.reduce<number>((a, b) => a + b, 0);
    this.cartTotalText?.setText(`Total: $${total}`);
    this.setPayEnabled(this.cartCoinValues.length > 0 && !this.problemResolved);
  }

  // ---------------- Diagnostic ----------------

  private async runDiagnostic(): Promise<void> {
    this.currentCoins = DIAGNOSTIC.coins;
    this.currentTimeoutMs = DIAGNOSTIC.problemTimeoutMs;
    this.refreshCoinPool(this.scale.width);

    const problems = this.generateProblems(
      DIAGNOSTIC.totalProblems,
      DIAGNOSTIC.priceRange[0],
      DIAGNOSTIC.priceRange[1],
    );
    this.totalProblems = problems.length;

    for (const p of problems) {
      if (this.ended) break;
      await this.presentProblem(p);
    }

    if (!this.ended) this.endChallenge();
  }

  protected override getEndMetadata(): Record<string, unknown> | undefined {
    if (this.mode !== "diagnostic") return undefined;
    const meanRTms =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;
    const meta: MercadoMatematicoMeta = {
      phase: "diagnostic",
      totalProblems: this.totalProblems,
      hits: this.hits,
      errors: this.commissions,
      omissions: this.omissions,
      meanRTms,
    };
    return meta as unknown as Record<string, unknown>;
  }

  // ---------------- Practice ----------------

  private async runPractice(level: PracticeLevel): Promise<void> {
    const cfg = PRACTICE_LEVELS[level];
    if (cfg.type === "problem") {
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

  private async runRound(cfg: ProblemRound): Promise<void> {
    this.currentCoins = cfg.coins;
    this.currentTimeoutMs = cfg.problemTimeoutMs;
    this.refreshCoinPool(this.scale.width);
    const problems = this.generateProblems(cfg.totalProblems, cfg.priceMin, cfg.priceMax);
    this.totalProblems += problems.length;
    for (const p of problems) {
      if (this.ended) break;
      await this.presentProblem(p);
    }
  }

  private async runComposite(cfg: CompositeRound): Promise<void> {
    for (const round of cfg.rounds) {
      if (this.ended) break;
      await this.runRound(round);
    }
  }

  // ---------------- Problem flow ----------------

  private generateProblems(n: number, priceMin: number, priceMax: number): ProblemInstance[] {
    const candidates = PRODUCTS_BANK.filter(
      (p) => p.price >= priceMin && p.price <= priceMax,
    );
    const list: ProblemInstance[] = [];
    for (let i = 0; i < n; i++) {
      const product = candidates[Math.floor(Math.random() * candidates.length)] ?? PRODUCTS_BANK[0];
      list.push({ product: product as Product });
    }
    return list;
  }

  private presentProblem(p: ProblemInstance): Promise<void> {
    return new Promise<void>((resolve) => {
      this.currentProblem = p;
      this.problemResolved = false;
      this.problemStartTs = Date.now();
      this.clearCart();
      this.updateProductCard(p.product);
      this.setMascotText("¿Cuántas monedas necesitas?");

      this.resolveProblem = () => {
        this.resolveProblem = undefined;
        resolve();
      };

      this.problemTimer?.remove();
      this.problemTimer = this.time.delayedCall(this.currentTimeoutMs, () => {
        if (this.problemResolved || this.ended) return;
        this.problemResolved = true;
        this.omissions += 1;
        this.emitTelemetry("user_response", {
          correct: false,
          type: "omission",
          price: p.product.price,
        });
        this.flashFeedback("¡Tiempo!", "#F59E0B");
        this.setMascotText("Se acabó el tiempo…");
        this.setPayEnabled(false);
        this.time.delayedCall(900, () => this.resolveProblem?.());
      });
    });
  }

  private updateProductCard(product: Product): void {
    this.productEmojiText?.setText(product.emoji);
    this.productNameText?.setText(`Comprar ${product.name}`);
    this.productPriceText?.setText(`$${product.price}`);
  }

  private onPayClicked(): void {
    if (!this.payEnabled || !this.currentProblem || this.problemResolved || this.ended) return;
    this.problemResolved = true;
    this.problemTimer?.remove();
    this.problemTimer = undefined;

    const sum = this.cartCoinValues.reduce<number>((a, b) => a + b, 0);
    const expected = this.currentProblem.product.price;
    const rt = Date.now() - this.problemStartTs;

    if (sum === expected) {
      this.recordHit(rt, { type: "hit", price: expected, sum });
      this.flashFeedback("¡BIEN!", "#10B981");
      this.setMascotText("¡Justo el precio!");
      this.sound.play(SOUND_CORRECT, { volume: 0.4 });
    } else {
      this.commissions += 1;
      this.recordError(rt, {
        type: sum > expected ? "over" : "under",
        price: expected,
        sum,
      });
      const msg = sum > expected ? "¡Sobró!" : "¡Faltó!";
      this.flashFeedback(`¡UPS! ${msg}`, "#EF4444");
      this.setMascotText(sum > expected ? "Pagaste de más…" : "No alcanza la plata.");
      this.sound.play(SOUND_WRONG, { volume: 0.4 });
    }
    this.updateHud();
    this.setPayEnabled(false);
    this.time.delayedCall(1100, () => this.resolveProblem?.());
  }

  // ---------------- Feedback ----------------

  private flashFeedback(text: string, color: string): void {
    if (!this.feedbackText) return;
    const fb = this.feedbackText;
    fb.setText(text);
    fb.setColor(color);
    fb.setDepth(1000);
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

    if (!this.feedbackOverlay) return;
    const fillColor = color === "#10B981" ? PALETTE.correct : PALETTE.wrong;
    this.feedbackOverlay.setFillStyle(fillColor, 0.18);
    this.tweens.add({
      targets: this.feedbackOverlay,
      fillAlpha: 0,
      duration: 360,
      ease: "Sine.out",
    });
  }

  private setMascotText(text: string): void {
    if (!this.mascotText) return;
    if (this.mascotText.text === text) return;
    this.mascotText.setText(text);
  }

  private updateHud(): void {
    this.hudHitsText?.setText(`📦 ${this.hits}`);
    this.hudErrorsText?.setText(`⚠️ ${this.commissions}`);
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
