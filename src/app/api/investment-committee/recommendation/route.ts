import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const allowed = new Set(["Build", "Validate", "Watch", "Reject", "Paused"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const marketSlug = String(body.marketSlug ?? "");
  const proposedRecommendation = String(body.proposedRecommendation ?? "");
  const rationale = String(body.rationale ?? "").trim();
  const reviewerNote = typeof body.reviewerNote === "string" ? body.reviewerNote.trim() : "";

  if (!marketSlug || !allowed.has(proposedRecommendation)) {
    return NextResponse.json({ error: "Invalid market or recommendation." }, { status: 400 });
  }

  if (rationale.length < 12) {
    return NextResponse.json({ error: "A rationale of at least 12 characters is required." }, { status: 400 });
  }

  const db = getDb();
  const market = await db.market.findUnique({
    where: { slug: marketSlug },
    include: {
      criticalUnknowns: true,
      killCriteria: true,
      claims: { take: 8 },
      scores: true,
    },
  });

  if (!market) {
    return NextResponse.json({ error: "Market not found." }, { status: 404 });
  }

  const linkedCriticalUnknowns = market.criticalUnknowns.filter((item) => item.status !== "validated").map((item) => item.id);
  const linkedKillCriteria = market.killCriteria.filter((item) => item.status !== "safe").map((item) => item.id);
  const linkedClaims = market.claims.map((claim) => claim.id);
  const linkedScoreChanges = market.scores.map((score) => score.id);

  const result = await db.$transaction(async (tx) => {
    const history = await tx.recommendationHistory.create({
      data: {
        marketId: market.id,
        previousRecommendation: market.recommendation,
        proposedRecommendation,
        rationale,
        reviewerNote,
        linkedClaims: JSON.stringify(linkedClaims),
        linkedSources: JSON.stringify([]),
        linkedScoreChanges: JSON.stringify(linkedScoreChanges),
        linkedCriticalUnknowns: JSON.stringify(linkedCriticalUnknowns),
        linkedKillCriteria: JSON.stringify(linkedKillCriteria),
        approved: true,
        approvedBy: "Local Researcher",
        approvedAt: new Date(),
      },
    });

    const decisionLog = await tx.decisionLog.create({
      data: {
        marketId: market.id,
        title: `Recommendation changed to ${proposedRecommendation}`,
        decision: `Approve recommendation change: ${market.recommendation} -> ${proposedRecommendation}`,
        rationale,
        previousValue: market.recommendation,
        newValue: proposedRecommendation,
        decisionType: "recommendation_change",
        linkedClaims: JSON.stringify(linkedClaims),
        linkedSources: JSON.stringify([]),
        linkedScoreChanges: JSON.stringify(linkedScoreChanges),
        linkedRisks: JSON.stringify(linkedCriticalUnknowns),
        approvedBy: "Local Researcher",
      },
    });

    await tx.timelineEvent.create({
      data: {
        marketId: market.id,
        type: "recommendation_change",
        title: `Recommendation changed to ${proposedRecommendation}`,
        description: rationale,
        linkedEntityType: "DecisionLog",
        linkedEntityId: decisionLog.id,
      },
    });

    await tx.market.update({
      where: { id: market.id },
      data: { recommendation: proposedRecommendation },
    });

    return { history, decisionLog };
  });

  return NextResponse.json(result, { status: 201 });
}
