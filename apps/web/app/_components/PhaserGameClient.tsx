"use client";

import dynamic from "next/dynamic";

const PhaserGameClient = dynamic(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="mx-auto flex h-[600px] w-[800px] items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
      Cargando motor de juego…
    </div>
  ),
});

export default PhaserGameClient;
