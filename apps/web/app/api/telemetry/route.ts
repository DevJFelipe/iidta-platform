import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const telemetryEventSchema = z.object({
  type: z.string().min(1),
  challengeId: z.string().min(1),
  studentCode: z.string().min(1),
  sessionId: z.string().min(1),
  ts: z.number().int().positive(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(200),
});

export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // TODO PROMPT 5+: persistir en Supabase (tabla telemetry_events).
  return NextResponse.json({ ok: true, accepted: parsed.data.events.length });
}
