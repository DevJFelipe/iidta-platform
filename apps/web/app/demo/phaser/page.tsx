import { PhaserMount } from "@iidta/core/engine";

export const metadata = {
  title: "IIDTA — Phaser bridge demo",
  description: "Verificación del bridge Phaser + Next.js App Router (PROMPT 2).",
};

export default function PhaserDemoPage(): JSX.Element {
  return (
    <main className="min-h-screen bg-[#FAF7F2] p-8">
      <header className="mx-auto mb-8 max-w-4xl">
        <h1 className="text-2xl font-semibold text-neutral-900">Phaser bridge demo</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Verificación de que <code>@iidta/core</code> + Phaser 3 funciona dentro de Next.js 14 App
          Router (cargado con <code>ssr: false</code>).
        </p>
      </header>

      <section className="mx-auto max-w-4xl">
        <PhaserMount />
      </section>
    </main>
  );
}
