import * as Phaser from "phaser";

export class HelloWorldScene extends Phaser.Scene {
  constructor() {
    super({ key: "HelloWorldScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 24, "IIDTA — Phaser bridge OK", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "32px",
        color: "#10B981",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 24, "Hello, world", {
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "20px",
        color: "#64748B",
      })
      .setOrigin(0.5);

    const dot = this.add.circle(width / 2, height - 60, 8, 0x4f46e5);
    this.tweens.add({
      targets: dot,
      x: { from: 60, to: width - 60 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }
}
