import { notFound } from "next/navigation";
import type { Level } from "@iidta/core/scoring";
import { findManifest } from "@iidta/core/registry";

const VALID_LEVELS = new Set<Level>(["primaria", "secundaria", "media"]);

interface RetoPageProps {
  params: { level: string; code: string };
}

export default function RetoPage({ params }: RetoPageProps): JSX.Element {
  if (!VALID_LEVELS.has(params.level as Level)) {
    notFound();
  }
  const level = params.level as Level;
  const code = decodeURIComponent(params.code);

  const manifest = findManifest(code);
  if (!manifest || manifest.level !== level) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {manifest.level} · {manifest.dimension} · ítem {manifest.itemCode}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{manifest.title}</h1>
        {manifest.description ? (
          <p className="mt-2 text-sm text-neutral-700">{manifest.description}</p>
        ) : null}
      </header>

      <section className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-600">
        TODO PROMPT 3+: montar <code>ChallengeRunner</code> con consentimiento + telemetría +
        persistencia local.
      </section>
    </main>
  );
}
