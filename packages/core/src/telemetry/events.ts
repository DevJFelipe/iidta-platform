import type { TelemetryEvent, TelemetryEventType } from "../scoring/types";

export type { TelemetryEvent, TelemetryEventType };

interface BaseContext {
  challengeId: string;
  studentCode: string;
  sessionId: string;
}

export function makeEvent(
  type: TelemetryEventType,
  ctx: BaseContext,
  data?: Record<string, unknown>,
): TelemetryEvent {
  return {
    type,
    challengeId: ctx.challengeId,
    studentCode: ctx.studentCode,
    sessionId: ctx.sessionId,
    ts: Date.now(),
    data,
  };
}

export const challengeStarted = (ctx: BaseContext, data?: Record<string, unknown>) =>
  makeEvent("challenge_started", ctx, data);

export const challengeEnded = (ctx: BaseContext, data?: Record<string, unknown>) =>
  makeEvent("challenge_ended", ctx, data);

export const phaseChanged = (ctx: BaseContext, phase: "diagnostic" | "practice" | "feedback") =>
  makeEvent("phase_changed", ctx, { phase });

export const userResponse = (
  ctx: BaseContext,
  data: { correct: boolean; responseTimeMs: number; itemIndex?: number },
) => makeEvent("user_response", ctx, data);

export const errorEvent = (ctx: BaseContext, message: string, stack?: string) =>
  makeEvent("error", ctx, { message, stack });
