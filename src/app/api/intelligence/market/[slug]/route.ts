import { NextRequest, NextResponse } from "next/server";
import { buildDecisionTrace, buildInitialMarketGraph, buildSourceImpactTrace, type GraphBuildOptions, type GraphLayout } from "@/lib/intelligence/graph";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const mode = (searchParams.get("mode") ?? "default") as GraphBuildOptions["mode"];
  const focusNodeId = searchParams.get("focus") ?? undefined;
  const layout = (searchParams.get("layout") ?? undefined) as GraphLayout | undefined;
  const includeSources = searchParams.get("includeSources") === "true";
  const limit = Number(searchParams.get("limit") ?? "10");

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid market slug." }, { status: 400 });
  }

  if (mode === "decision") {
    return NextResponse.json(await buildDecisionTrace(slug));
  }

  if (mode === "source-impact") {
    return NextResponse.json(await buildSourceImpactTrace(slug, focusNodeId));
  }

  return NextResponse.json(await buildInitialMarketGraph(slug, { mode, focusNodeId, includeSources, limit, layout }));
}
