// Server-safe engine exports (no Phaser at module scope).
// Phaser scenes (BaseScene, HelloWorldScene) live in `./scenes` y se cargan
// vía dynamic import del lado cliente.
export { ChallengeRunner } from "./ChallengeRunner";
export type { ChallengeRunnerProps } from "./ChallengeRunner";
export { NarrativeRunner } from "./NarrativeRunner";
export type { NarrativeRunnerProps } from "./NarrativeRunner";
export { PhaserMount } from "./PhaserMount";
export type { PhaserMountProps } from "./PhaserMount";
