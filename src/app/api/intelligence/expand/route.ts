import { NextRequest, NextResponse } from "next/server";
import { expandGraphNode } from "@/lib/intelligence/graph";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const marketSlug = request.nextUrl.searchParams.get("marketSlug");
  const nodeId = request.nextUrl.searchParams.get("nodeId");
  const limit = Math.min(75, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "25")));

  if (!marketSlug || !/^[a-z0-9-]+$/.test(marketSlug)) {
    return NextResponse.json({ error: "marketSlug is required." }, { status: 400 });
  }

  if (!nodeId || nodeId.length > 160) {
    return NextResponse.json({ error: "nodeId is required." }, { status: 400 });
  }

  return NextResponse.json(await expandGraphNode(marketSlug, nodeId, limit));
}
