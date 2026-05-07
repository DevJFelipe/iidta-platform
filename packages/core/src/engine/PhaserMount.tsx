"use client";

import { useEffect, useRef } from "react";
import type * as PhaserNS from "phaser";

export interface PhaserMountProps {
  width?: number;
  height?: number;
  /**
   * Lazy loader que devuelve los Phaser.Scene classes a montar.
   * Si se omite, monta HelloWorldScene como smoke test.
   * IMPORTANTE: el caller debe memoizar (useCallback/useMemo) para evitar
   * remounts en cada render.
   */
  loadScenes?: () => Promise<unknown[]>;
  /**
   * Datos que se inyectan en game.registry["runtime"] vía preBoot.
   * BaseScene.init() los lee como fallback cuando no recibe data por
   * scene.start(). Debe estar memoizado.
   */
  sceneInitData?: unknown;
  backgroundColor?: string;
  className?: string;
  /**
   * Fuentes a precargar antes de inicializar Phaser. Canvas2D no espera a
   * `next/font` por sí solo; sin esto, los primeros estímulos se pintan con
   * el fallback del sistema. Usa la sintaxis short-hand de CSS, p.ej.
   * `["bold 1em Fredoka", "1em Nunito"]`.
   */
  preloadFonts?: readonly string[];
}

const defaultLoadScenes = async (): Promise<unknown[]> => {
  const { HelloWorldScene } = await import("./scenes");
  return [HelloWorldScene];
};

const DEFAULT_PRELOAD_FONTS: readonly string[] = ["bold 1em Fredoka", "1em Nunito"];

async function ensureFontsReady(fonts: readonly string[]): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all(fonts.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch {
    // Si la fuente no está disponible (offline, etc.), Phaser cae al fallback
    // del fontFamily declarado por la scene. No bloqueamos el reto por esto.
  }
}

export function PhaserMount({
  width = 800,
  height = 600,
  loadScenes = defaultLoadScenes,
  sceneInitData,
  backgroundColor = "#FAF7F2",
  className = "mx-auto overflow-hidden rounded-lg shadow-lg",
  preloadFonts = DEFAULT_PRELOAD_FONTS,
}: PhaserMountProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserNS.Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    const parent = containerRef.current;
    if (!parent) return;

    void (async () => {
      const [Phaser, scenes] = await Promise.all([
        import("phaser"),
        loadScenes(),
        ensureFontsReady(preloadFonts),
      ]);
      if (cancelled) return;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        width,
        height,
        backgroundColor,
        scene: scenes as PhaserNS.Types.Scenes.SceneType[],
        callbacks:
          sceneInitData !== undefined
            ? {
                preBoot: (game: PhaserNS.Game) => {
                  game.registry.set("runtime", sceneInitData);
                },
              }
            : undefined,
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
  }, [width, height, loadScenes, sceneInitData, backgroundColor, preloadFonts]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: "100%",
        maxWidth: width,
        aspectRatio: `${width} / ${height}`,
      }}
      data-testid="phaser-mount"
    />
  );
}
