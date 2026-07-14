import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const marketSlug = request.nextUrl.searchParams.get("marketSlug") ?? undefined;
  const where = marketSlug ? { marketSlug } : {};
  const views = await getDb().savedGraphView.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ views: views.map(deserializeView) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "A saved view name is required." }, { status: 400 });
  }

  const market = typeof body.marketSlug === "string"
    ? await getDb().market.findUnique({ where: { slug: body.marketSlug } })
    : null;

  const view = await getDb().savedGraphView.create({
    data: {
      name: body.name.trim().slice(0, 80),
      marketId: market?.id,
      marketSlug: market?.slug ?? body.marketSlug ?? null,
      filters: JSON.stringify(body.filters ?? {}),
      layout: String(body.layout ?? "hierarchical"),
      visibleNodeTypes: JSON.stringify(body.visibleNodeTypes ?? []),
      pinnedNodes: JSON.stringify(body.pinnedNodes ?? []),
      focusedNode: body.focusedNode ?? null,
      viewport: JSON.stringify(body.viewport ?? {}),
    },
  });

  return NextResponse.json({ view: deserializeView(view) }, { status: 201 });
}

function deserializeView(view: {
  id: string;
  name: string;
  marketSlug: string | null;
  filters: string;
  layout: string;
  visibleNodeTypes: string;
  pinnedNodes: string;
  focusedNode: string | null;
  viewport: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: view.id,
    name: view.name,
    marketSlug: view.marketSlug,
    filters: safeJson(view.filters, {}),
    layout: view.layout,
    visibleNodeTypes: safeJson(view.visibleNodeTypes, []),
    pinnedNodes: safeJson(view.pinnedNodes, []),
    focusedNode: view.focusedNode,
    viewport: safeJson(view.viewport, {}),
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
  };
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
