import type { LikertScore, NormStats } from "./types";

export function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

export function likertFromZ(z: number): LikertScore {
  if (z <= -1) return 3;
  if (z <= -0.3) return 2;
  if (z <= 0.3) return 1;
  return 0;
}

export function likertMap(value: number, norm: NormStats): LikertScore {
  return likertFromZ(zScore(value, norm.mean, norm.stdDev));
}
