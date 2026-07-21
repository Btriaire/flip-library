import { NextRequest, NextResponse } from "next/server";
import { searchTheConversation } from "@/lib/theconversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tag = req.nextUrl.searchParams.get("tag")?.trim();
  if (!tag) return NextResponse.json({ items: [] });
  try {
    const items = await searchTheConversation(tag);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, items: [] }, { status: 502 });
  }
}
