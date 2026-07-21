import { NextRequest, NextResponse } from "next/server";
import { suggestTags } from "@/lib/jarvis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const environment: string | undefined = body?.environment;
  const existingTags: string[] = body?.existingTags || [];
  if (!environment) return NextResponse.json({ error: "environment required" }, { status: 400 });

  try {
    const suggestions = await suggestTags(environment, existingTags);
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, suggestions: [] }, { status: 502 });
  }
}
