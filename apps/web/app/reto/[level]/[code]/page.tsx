import { notFound } from "next/navigation";
import type { Level } from "@iidta/core/scoring";
import { findManifest } from "@iidta/core/registry";
import { ensureManifestsRegistered } from "@/lib/registerManifests";
import { RetoRunner } from "./RetoRunner";

const VALID_LEVELS = new Set<Level>(["primaria", "secundaria", "media"]);

interface RetoPageProps {
  params: { level: string; code: string };
}

export default function RetoPage({ params }: RetoPageProps): JSX.Element {
  ensureManifestsRegistered();

  if (!VALID_LEVELS.has(params.level as Level)) {
    notFound();
  }
  const level = params.level as Level;
  const code = decodeURIComponent(params.code);

  const manifest = findManifest(code);
  if (!manifest || manifest.level !== level) {
    notFound();
  }

  // No pasamos el manifest al cliente (contiene funciones — no serializable).
  // Solo el id; el cliente hace su propio findManifest.
  return <RetoRunner manifestId={manifest.id} level={level} />;
}
