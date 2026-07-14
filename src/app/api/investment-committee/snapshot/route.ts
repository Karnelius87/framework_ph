import { NextResponse } from "next/server";
import { CURRENT_SCORING_FRAMEWORK_VERSION } from "@/config/scoring";
import { getDb } from "@/lib/db";
import { getInvestmentCommitteeData } from "@/lib/investment/committee";

export async function GET() {
  const snapshots = await getDb().investmentCommitteeSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      title: snapshot.title,
      notes: snapshot.notes,
      createdAt: snapshot.createdAt,
      rankings: JSON.parse(snapshot.rankings),
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const data = await getInvestmentCommitteeData();
  const payload = {
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : `Committee Snapshot ${new Date().toLocaleDateString("sv-SE")}`,
    notes: typeof body.notes === "string" ? body.notes : null,
    includedMarkets: JSON.stringify(data.snapshotTemplate.includedMarkets),
    finalistSelection: JSON.stringify(Array.isArray(body.finalists) ? body.finalists : data.snapshotTemplate.finalistSelection),
    rankings: JSON.stringify(data.snapshotTemplate.rankings),
    frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
  };

  const db = getDb();
  const [snapshot] = await db.$transaction([
    db.investmentCommitteeSnapshot.create({ data: payload }),
    db.rankingSnapshot.create({
      data: {
        includedMarkets: payload.includedMarkets,
        marketScores: JSON.stringify(Object.fromEntries(data.rows.map((row) => [row.slug, row.marketScore]))),
        decisionScores: JSON.stringify(Object.fromEntries(data.rows.map((row) => [row.slug, row.decisionScore]))),
        confidenceValues: JSON.stringify(Object.fromEntries(data.rows.map((row) => [row.slug, row.confidence]))),
        recommendations: JSON.stringify(Object.fromEntries(data.rows.map((row) => [row.slug, row.recommendation]))),
        frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
        rankingOrder: JSON.stringify(data.rows.map((row) => row.slug)),
      },
    }),
  ]);

  return NextResponse.json({ snapshot }, { status: 201 });
}
