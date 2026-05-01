import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  studentCode: z.string().min(3).max(64),
  level: z.union([z.literal("primaria"), z.literal("secundaria"), z.literal("media")]),
  consentVersion: z.string().min(1),
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

  // TODO PROMPT 5+: crear sesión en Supabase y devolver sessionId firmado.
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return NextResponse.json({
    ok: true,
    sessionId,
    studentCode: parsed.data.studentCode,
    level: parsed.data.level,
  });
}
