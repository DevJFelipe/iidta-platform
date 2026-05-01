"use client";

import { useEffect, useRef } from "react";
import type * as PhaserNS from "phaser";

export interface PhaserGameProps {
  width?: number;
  height?: number;
  loadScenes?: () => Promise<unknown[]>;
  backgroundColor?: string;
}

async function defaultLoadScenes(): Promise<unknown[]> {
  const { HelloWorldScene } = await import("@iidta/core/engine/scenes");
  return [HelloWorldScene];
}

export default function PhaserGame({
  width = 800,
  height = 600,
  loadScenes = defaultLoadScenes,
  backgroundColor = "#FAF7F2",
}: PhaserGameProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserNS.Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    const parent = containerRef.current;
    if (!parent) return;

    void (async () => {
      const [Phaser, scenes] = await Promise.all([import("phaser"), loadScenes()]);
      if (cancelled) return;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width,
        height,
        backgroundColor,
        scene: scenes as PhaserNS.Types.Scenes.SceneType[],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      });
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true, false);
      gameRef.current = null;
    };
  }, [width, height, loadScenes, backgroundColor]);

  return (
    <div
      ref={containerRef}
      className="mx-auto overflow-hidden rounded-lg shadow-lg"
      style={{ width, height }}
      data-testid="phaser-mount"
    />
  );
}
