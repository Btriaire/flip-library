import { NextRequest, NextResponse } from "next/server";
import { getArticleImage } from "@/lib/scrape";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ image: null });
  const image = await getArticleImage(url);
  return NextResponse.json({ image });
}
