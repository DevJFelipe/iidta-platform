// Server-safe engine exports (no Phaser at module scope).
// Phaser scenes (BaseScene, HelloWorldScene) live in `./scenes` and must be
// loaded via a client-side dynamic import (e.g. `await import("@iidta/core/engine/scenes")`).
export { ChallengeRunner } from "./ChallengeRunner";
export type { ChallengeRunnerProps } from "./ChallengeRunner";
export { NarrativeRunner } from "./NarrativeRunner";
export type { NarrativeRunnerProps } from "./NarrativeRunner";
