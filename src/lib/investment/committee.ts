import { CURRENT_SCORING_FRAMEWORK_VERSION, calculateWeightedMarketScore, scoringCategories } from "@/config/scoring";
import { getDb } from "@/lib/db";
import {
  categoryContributions,
  createRankingSnapshotPayload,
  decisionGap,
  rankMarkets,
  runScenario,
  scenarioSensitivity,
  type CommitteeMarketInput,
  type Recommendation,
  type ScenarioInput,
} from "@/lib/investment/calculations";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function freshnessWarning(label: string, freshnessStatus?: string | null, lastVerifiedAt?: Date | null) {
  if (freshnessStatus === "stale") return `${label} stale`;
  if (!lastVerifiedAt) return `${label} has no verification date`;
  const ageDays = (Date.now() - lastVerifiedAt.getTime()) / 86_400_000;
  if (ageDays > 180) return `${label} source aging`;
  return null;
}

export async function getInvestmentCommitteeData() {
  const db = getDb();
  const [markets, snapshots, rankingSnapshots] = await Promise.all([
    db.market.findMany({
      orderBy: { score: "desc" },
      include: {
        scores: { include: { scoreCategory: true } },
        decisionMetric: true,
        researchCoverage: true,
        criticalUnknowns: true,
        killCriteria: true,
        strategicAdvantages: { orderBy: { confidence: "desc" } },
        strategicDisadvantages: { orderBy: { confidence: "desc" } },
        researchActions: { orderBy: [{ priority: "asc" }, { estimatedImpact: "desc" }] },
        founderFitMetric: true,
        executionReadinessMetric: true,
        leadershipMetric: true,
        leadershipSubfactors: true,
        decisionReadiness: { include: { items: true } },
        memoSummary: true,
        recommendationHistory: { orderBy: { createdAt: "desc" }, take: 5 },
        scenarios: { include: { adjustments: true }, orderBy: { updatedAt: "desc" }, take: 3 },
        claims: { include: { sources: { include: { source: true } } } },
        competitors: true,
        timelineEvents: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    db.investmentCommitteeSnapshot.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.rankingSnapshot.findMany({ orderBy: { timestamp: "desc" }, take: 8 }),
  ]);

  const rows = markets.map((market): CommitteeMarketInput => {
    const marketScore = market.scores.length
      ? calculateWeightedMarketScore(market.scores.map((score) => ({ key: score.scoreCategory.key, score: score.score })))
      : market.score;
    const decisionMetric = market.decisionMetric;
    const scoreByKey = Object.fromEntries(market.scores.map((score) => [score.scoreCategory.key, score.score]));
    const hasTriggeredKill = market.killCriteria.some((item) => item.status === "triggered");
    const hasFatalKill = market.killCriteria.some((item) => item.status === "triggered" && item.severity === "fatal");

    return {
      slug: market.slug,
      name: market.name,
      status: market.status,
      stage: market.stage,
      marketScore,
      decisionScore: decisionMetric?.decisionScore ?? marketScore,
      chance: decisionMetric?.chanceOfBecomingNumberOne ?? market.chance,
      confidence: decisionMetric?.confidence ?? market.confidence,
      completeness: decisionMetric?.researchCompleteness ?? market.completeness,
      customerValidation: decisionMetric?.customerValidation ?? market.researchCoverage.find((item) => item.category === "customer_validation")?.score ?? market.completeness,
      competitorCoverage: decisionMetric?.competitorCoverage ?? market.researchCoverage.find((item) => item.category === "competition")?.score ?? market.completeness,
      founderFit: decisionMetric?.founderFit ?? market.founderFitMetric?.score ?? market.confidence,
      executionReadiness: decisionMetric?.executionReadiness ?? market.executionReadinessMetric?.score ?? market.completeness,
      marketFragmentation: Number(scoreByKey.fragmentation ?? market.score),
      workflowStickiness: Number(scoreByKey.stickiness ?? market.score),
      competitionWhiteSpace: Number(scoreByKey.competition ?? market.score),
      criticalUnknownCount: market.criticalUnknowns.filter((item) => !["validated", "disproven", "resolved"].includes(item.status)).length,
      hasFatalKill,
      hasTriggeredKill,
      recommendation: market.recommendation,
    };
  });

  const ranked = rankMarkets(rows);
  const finalistSlugs = ranked.filter((market) => ["workshop", "beauty"].includes(market.slug)).map((market) => market.slug);
  const defaultFinalists = finalistSlugs.length >= 2 ? finalistSlugs : ranked.slice(0, 2).map((market) => market.slug);
  const rowsBySlug = Object.fromEntries(ranked.map((row) => [row.slug, row]));

  const detailedMarkets = markets.map((market) => {
    const row = rowsBySlug[market.slug];
    const scoreClaims = new Map<string, { claims: number; opposingClaims: number; sources: number; confidence: number }>();
    for (const category of scoringCategories) {
      const claims = market.claims.filter((claim) => claim.scoreCategoryId && market.scores.some((score) => score.scoreCategoryId === claim.scoreCategoryId && score.scoreCategory.key === category.key));
      scoreClaims.set(category.key, {
        claims: claims.filter((claim) => claim.direction !== "opposes").length,
        opposingClaims: claims.filter((claim) => claim.direction === "opposes").length,
        sources: new Set(claims.flatMap((claim) => claim.sources.map((source) => source.sourceId))).size,
        confidence: Math.round(claims.reduce((sum, claim) => sum + claim.confidence, 0) / Math.max(1, claims.length)),
      });
    }

    const contributions = categoryContributions(market.scores.map((score) => {
      const evidence = scoreClaims.get(score.scoreCategory.key);
      return {
        key: score.scoreCategory.key,
        score: score.score,
        claims: evidence?.claims ?? 0,
        opposingClaims: evidence?.opposingClaims ?? 0,
        sources: evidence?.sources ?? 0,
        confidence: evidence?.confidence || row.confidence,
      };
    }));

    const freshnessWarnings = [
      freshnessWarning("Market size", market.freshnessStatus, market.lastVerifiedAt),
      ...market.competitors.map((competitor) => freshnessWarning(`${competitor.company} pricing`, competitor.freshnessStatus, competitor.lastVerifiedAt)),
      ...market.researchCoverage.filter((coverage) => coverage.freshnessStatus === "stale").map((coverage) => `${coverage.label} outdated`),
    ].filter(Boolean) as string[];

    const scenarioBase: ScenarioInput = {
      totalMarketScore: row.marketScore,
      researchConfidence: row.confidence,
      researchCompleteness: row.completeness,
      customerValidation: row.customerValidation,
      competitorCoverage: row.competitorCoverage,
      executionReadiness: row.executionReadiness,
      founderFit: row.founderFit,
      chanceOfBecomingNumberOne: row.chance,
      criticalUnknownPenalty: market.decisionMetric?.criticalUnknownPenalty ?? 0,
      killCriteriaPenalty: market.decisionMetric?.killCriteriaPenalty ?? 0,
    };

    return {
      ...row,
      id: market.id,
      updatedAt: market.updatedAt.toISOString(),
      lastVerifiedAt: market.lastVerifiedAt?.toISOString() ?? null,
      topReasonToPursue: market.strategicAdvantages[0]?.title ?? "No structured reason to pursue yet",
      topReasonToReject: market.strategicDisadvantages[0]?.title ?? "No structured rejection reason yet",
      reasonsToPursue: market.strategicAdvantages.map((item) => item.title),
      reasonsToReject: market.strategicDisadvantages.map((item) => item.title),
      criticalUnknowns: market.criticalUnknowns.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        importance: item.importance,
        confidenceGap: Math.max(0, item.targetConfidence - item.currentConfidence),
        recommendedAction: item.recommendedAction,
      })),
      killCriteria: market.killCriteria.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        severity: item.severity,
        threshold: item.threshold,
        reviewerNote: item.reviewerNote,
      })),
      nextActions: market.researchActions.map((item) => ({
        id: item.id,
        title: item.title,
        priority: item.priority,
        reason: item.reason,
        estimatedImpact: item.estimatedImpact,
        expectedConfidenceImprovement: item.expectedConfidenceImprovement,
        linkedUnknownId: item.linkedUnknownId,
        linkedKillCriterionId: item.linkedKillCriterionId,
      })),
      coverage: market.researchCoverage.map((item) => ({
        label: item.label,
        score: item.score,
        targetScore: item.targetScore,
        confidence: item.confidence,
        gaps: item.gaps,
        recommendedNextAction: item.recommendedNextAction,
        evidenceCount: item.evidenceCount,
        verifiedEvidenceCount: item.verifiedEvidenceCount,
      })),
      contributions,
      readiness: market.decisionReadiness ? {
        overallPercentage: market.decisionReadiness.overallPercentage,
        blockers: parseJson<string[]>(market.decisionReadiness.blockers, []),
        missingValidation: parseJson<string[]>(market.decisionReadiness.missingValidation, []),
        requiredActionBeforeBuild: market.decisionReadiness.requiredActionBeforeBuild,
        items: market.decisionReadiness.items.map((item) => ({
          key: item.key,
          label: item.label,
          status: item.status,
          evidenceNote: item.evidenceNote,
          requiredAction: item.requiredAction,
        })),
      } : deriveReadiness(row),
      leadershipSubfactors: market.leadershipSubfactors.length ? market.leadershipSubfactors.map((item) => ({
        key: item.key,
        label: item.label,
        score: item.score,
        weight: item.weight,
        confidence: item.confidence,
        linkedClaims: parseJson<string[]>(item.linkedClaims, []),
        linkedSources: parseJson<string[]>(item.linkedSources, []),
        reviewerNote: item.reviewerNote,
      })) : deriveLeadership(row),
      memo: market.memoSummary ? {
        thesis: market.memoSummary.thesis,
        whyNow: market.memoSummary.whyNow,
        whyThisMarket: market.memoSummary.whyThisMarket,
        whyWeCanWin: market.memoSummary.whyWeCanWin,
        whyWeMayLose: market.memoSummary.whyWeMayLose,
        topRisks: parseJson<string[]>(market.memoSummary.topRisks, []),
        criticalUnknowns: parseJson<string[]>(market.memoSummary.criticalUnknowns, []),
        killCriteria: parseJson<string[]>(market.memoSummary.killCriteria, []),
        requiredValidation: parseJson<string[]>(market.memoSummary.requiredValidation, []),
        recommendedNextStep: market.memoSummary.recommendedNextStep,
        currentRecommendation: market.memoSummary.currentRecommendation,
        recommendationConfidence: market.memoSummary.recommendationConfidence,
      } : deriveMemo(row, market.strategicAdvantages.map((item) => item.title), market.strategicDisadvantages.map((item) => item.title)),
      recommendationHistory: market.recommendationHistory.map((item) => ({
        id: item.id,
        previousRecommendation: item.previousRecommendation,
        proposedRecommendation: item.proposedRecommendation,
        rationale: item.rationale,
        approved: item.approved,
        createdAt: item.createdAt.toISOString(),
      })),
      scenarios: market.scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        assumptions: parseJson<Record<string, unknown>>(scenario.assumptions, {}),
        results: parseJson<Record<string, unknown>>(scenario.results, {}),
        adjustments: scenario.adjustments.map((item) => ({ key: item.key, label: item.label, baseValue: item.baseValue, value: item.value })),
      })),
      scenarioBase,
      scenarioResults: {
        base: runScenario(scenarioBase, {}),
        optimistic: runScenario(scenarioBase, { totalMarketScore: row.marketScore + 8, researchConfidence: row.confidence + 10, customerValidation: row.customerValidation + 12 }),
        conservative: runScenario(scenarioBase, { totalMarketScore: row.marketScore - 8, researchConfidence: row.confidence - 10, criticalUnknownPenalty: scenarioBase.criticalUnknownPenalty + 4 }),
        competitorShock: runScenario(scenarioBase, { totalMarketScore: row.marketScore - 10, competitorCoverage: row.competitorCoverage - 8, killCriteriaPenalty: scenarioBase.killCriteriaPenalty + 6 }),
      },
      sensitivity: scenarioSensitivity(scenarioBase),
      freshnessWarnings,
      linkedClaims: market.claims.slice(0, 5).map((claim) => claim.statement),
      linkedSources: market.claims.flatMap((claim) => claim.sources.map((source) => source.source.title)).slice(0, 5),
    };
  });

  const detailedBySlug = Object.fromEntries(detailedMarkets.map((market) => [market.slug, market]));
  const detailedRanked = ranked.map((market) => detailedBySlug[market.slug]).filter(Boolean);
  const topTwo = ranked.slice(0, 2);

  return {
    rows: detailedRanked,
    markets: detailedRanked,
    finalists: defaultFinalists,
    summary: buildSummary(detailedRanked),
    gap: topTwo.length === 2 ? decisionGap(topTwo[0], topTwo[1]) : null,
    snapshotTemplate: createRankingSnapshotPayload(rows, defaultFinalists),
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      title: snapshot.title,
      notes: snapshot.notes,
      rankings: parseJson(snapshot.rankings, []),
      createdAt: snapshot.createdAt.toISOString(),
    })),
    rankingSnapshots: rankingSnapshots.map((snapshot) => ({
      id: snapshot.id,
      timestamp: snapshot.timestamp.toISOString(),
      rankingOrder: parseJson<string[]>(snapshot.rankingOrder, []),
    })),
    frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
  };
}

function buildSummary<T extends {
  decisionScore: number;
  marketScore: number;
  chance: number;
  completeness: number;
  customerValidation: number;
  criticalUnknownCount: number;
  hasTriggeredKill: boolean;
  suggestedRecommendation: string;
}>(ranked: T[]) {
  const highest = (selector: (market: (typeof ranked)[number]) => number) => [...ranked].sort((a, b) => selector(b) - selector(a))[0];
  return {
    leadingMarket: ranked[0],
    highestDecisionScore: highest((market) => market.decisionScore),
    highestMarketScore: highest((market) => market.marketScore),
    highestChance: highest((market) => market.chance),
    mostResearchComplete: highest((market) => market.completeness),
    highestCustomerValidation: highest((market) => market.customerValidation),
    mostCriticalUnknowns: highest((market) => market.criticalUnknownCount),
    triggeredKillMarkets: ranked.filter((market) => market.hasTriggeredKill),
    finalRecommendationStatus: (ranked[0]?.suggestedRecommendation ?? "Watch") as Recommendation,
  };
}

function deriveReadiness(row: CommitteeMarketInput) {
  const item = (key: string, label: string, value: number, threshold = 70) => ({
    key,
    label,
    status: value >= threshold ? "sufficient" : value >= threshold - 15 ? "partial" : value >= 35 ? "weak" : "not_started",
    evidenceNote: `Derived from current ${label.toLowerCase()} score (${Math.round(value)}).`,
    requiredAction: value >= threshold ? null : `Raise ${label.toLowerCase()} evidence above ${threshold}.`,
  });
  const items = [
    item("customer_interviews", "Minimum customer interviews completed", row.customerValidation, 65),
    item("competitor_landscape", "Competitor landscape sufficiently mapped", row.competitorCoverage),
    item("willingness_to_pay", "Willingness to pay validated", row.customerValidation),
    item("customer_workflow", "Customer workflow validated", row.workflowStickiness),
    item("market_count", "Market count estimated", row.marketFragmentation),
    item("core_pain", "Core pain validated", row.workflowStickiness),
    item("mvp_scope", "MVP scope defined", row.executionReadiness),
    item("distribution", "Distribution strategy identified", row.founderFit),
    item("kill_criteria", "Kill criteria reviewed", row.hasTriggeredKill ? 25 : 75),
    item("unknowns", "Critical unknowns below threshold", Math.max(0, 100 - row.criticalUnknownCount * 20)),
    item("founder_fit", "Founder fit assessed", row.founderFit),
    item("execution", "Execution readiness assessed", row.executionReadiness),
  ];
  const statusWeights: Record<string, number> = { not_started: 0, weak: 35, partial: 65, sufficient: 82, strong: 100 };
  const overallPercentage = Math.round(items.reduce((sum, readiness) => sum + statusWeights[readiness.status], 0) / items.length);
  return {
    overallPercentage,
    blockers: items.filter((readiness) => ["not_started", "weak"].includes(readiness.status)).map((readiness) => readiness.label),
    missingValidation: items.filter((readiness) => readiness.requiredAction).map((readiness) => readiness.requiredAction as string),
    requiredActionBeforeBuild: items.find((readiness) => readiness.requiredAction)?.requiredAction ?? "Ready for committee review.",
    items,
  };
}

function deriveLeadership(row: CommitteeMarketInput) {
  return [
    ["competitive_intensity", "Competitive intensity", 100 - row.competitionWhiteSpace, 12],
    ["incumbent_strength", "Incumbent strength", 100 - row.competitionWhiteSpace + 4, 10],
    ["market_fragmentation", "Market fragmentation", row.marketFragmentation, 12],
    ["localization_advantage", "Localization advantage", row.founderFit, 10],
    ["distribution_difficulty", "Distribution difficulty", 100 - row.executionReadiness, 8],
    ["switching_barriers", "Switching barriers", row.workflowStickiness, 10],
    ["product_differentiation", "Product differentiation", row.competitionWhiteSpace, 10],
    ["speed_advantage", "Speed advantage", row.executionReadiness, 8],
    ["capital_requirement", "Capital requirement", row.founderFit, 6],
    ["regulatory_barriers", "Regulatory barriers", row.executionReadiness, 4],
    ["customer_concentration", "Customer concentration", row.marketFragmentation, 5],
    ["brand_dependence", "Brand dependence", 100 - row.competitionWhiteSpace, 5],
  ].map(([key, label, score, weight]) => ({
    key: String(key),
    label: String(label),
    score: Math.max(0, Math.min(100, Math.round(Number(score)))),
    weight: Number(weight),
    confidence: row.confidence,
    linkedClaims: [],
    linkedSources: [],
    reviewerNote: "Derived from current committee metrics until reviewed subfactor data exists.",
  }));
}

function deriveMemo(row: CommitteeMarketInput, advantages: string[], disadvantages: string[]) {
  return {
    thesis: `${row.name} is currently ranked by Decision Score, confidence, and readiness using local research data.`,
    whyNow: "Operators still rely on fragmented chat, spreadsheets, and manual reconciliation.",
    whyThisMarket: advantages[0] ?? "The current score indicates a plausible vertical SaaS wedge.",
    whyWeCanWin: advantages.slice(0, 2).join("; ") || "A narrow local workflow can be tested quickly.",
    whyWeMayLose: disadvantages.slice(0, 2).join("; ") || "The strongest risks still need direct validation.",
    topRisks: disadvantages.slice(0, 3),
    criticalUnknowns: [`${row.criticalUnknownCount} unresolved critical unknowns`],
    killCriteria: [row.hasTriggeredKill ? "Triggered kill criterion requires review" : "No triggered kill criterion"],
    requiredValidation: ["Customer interviews", "Willingness to pay", "Competitor penetration"],
    recommendedNextStep: row.criticalUnknownCount > 0 ? "Resolve the highest-impact unknown before Build." : "Review for Build decision.",
    currentRecommendation: row.recommendation,
    recommendationConfidence: row.confidence,
  };
}
