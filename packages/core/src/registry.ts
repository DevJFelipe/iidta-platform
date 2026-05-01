import type { ChallengeManifest, Dimension, Level } from "./scoring/types";

const _registry = new Map<string, ChallengeManifest>();

export function registerManifest(manifest: ChallengeManifest): void {
  if (_registry.has(manifest.id)) {
    throw new Error(`Challenge manifest already registered: ${manifest.id}`);
  }
  _registry.set(manifest.id, manifest);
}

export function findManifest(id: string): ChallengeManifest | null {
  return _registry.get(id) ?? null;
}

export interface ListManifestsFilter {
  level?: Level;
  dimension?: Dimension;
}

export function listManifests(filter?: ListManifestsFilter): ChallengeManifest[] {
  const all = Array.from(_registry.values());
  if (!filter) return all;
  return all.filter(
    (m) =>
      (!filter.level || m.level === filter.level) &&
      (!filter.dimension || m.dimension === filter.dimension),
  );
}

export function clearRegistry(): void {
  _registry.clear();
}
