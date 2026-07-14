import { NextRequest, NextResponse } from "next/server";
import { buildDecisionTrace, buildSourceImpactTrace } from "@/lib/intelligence/graph";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const marketSlug = request.nextUrl.searchParams.get("marketSlug");
  const mode = request.nextUrl.searchParams.get("mode") ?? "decision";
  const sourceNodeId = request.nextUrl.searchParams.get("sourceNodeId") ?? undefined;

  if (!marketSlug || !/^[a-z0-9-]+$/.test(marketSlug)) {
    return NextResponse.json({ error: "marketSlug is required." }, { status: 400 });
  }

  if (mode === "source-impact") {
    return NextResponse.json(await buildSourceImpactTrace(marketSlug, sourceNodeId));
  }

  return NextResponse.json(await buildDecisionTrace(marketSlug));
}
