import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rawResultSchema = z.object({
  challengeId: z.string().min(1),
  studentCode: z.string().min(1),
  sessionId: z.string().min(1),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  hits: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  attempts: z.number().int().nonnegative(),
  responseTimes: z.array(z.number().nonnegative()),
  studentFeedback: z
    .object({
      difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
      enjoyment: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  raw: rawResultSchema,
  likertScore: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
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

  // TODO PROMPT 5+: persistir resultado en Supabase + auditoría Habeas Data.
  return NextResponse.json({
    ok: true,
    challengeId: parsed.data.raw.challengeId,
    likertScore: parsed.data.likertScore,
  });
}
