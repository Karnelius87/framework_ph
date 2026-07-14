import { NextRequest, NextResponse } from "next/server";
import { searchGraphRecords } from "@/lib/intelligence/graph";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const marketSlug = request.nextUrl.searchParams.get("marketSlug") ?? undefined;

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: await searchGraphRecords(marketSlug, q, 25) });
}
