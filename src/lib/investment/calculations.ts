import { CURRENT_SCORING_FRAMEWORK_VERSION, scoringCategories, weightedContribution } from "@/config/scoring";
import { calculateDecisionScore } from "@/lib/decision/calculations";

export type Recommendation = "Build" | "Validate" | "Watch" | "Reject" | "Paused";
export type Quadrant = "Build" | "Validate" | "Watch" | "Reject";

export type CommitteeMarketInput = {
  slug: string;
  name: string;
  status: string;
  stage: string;
  marketScore: number;
  decisionScore: number;
  chance: number;
  confidence: number;
  completeness: number;
  customerValidation: number;
  competitorCoverage: number;
  founderFit: number;
  executionReadiness: number;
  marketFragmentation: number;
  workflowStickiness: number;
  competitionWhiteSpace: number;
  criticalUnknownCount: number;
  hasFatalKill: boolean;
  hasTriggeredKill: boolean;
  recommendation: string;
};

export type ScenarioInput = {
  totalMarketScore: number;
  researchConfidence: number;
  researchCompleteness: number;
  customerValidation: number;
  competitorCoverage: number;
  executionReadiness: number;
  founderFit: number;
  chanceOfBecomingNumberOne: number;
  criticalUnknownPenalty: number;
  killCriteriaPenalty: number;
};

export type ScenarioAdjustmentInput = Partial<ScenarioInput>;

export function normalizeRecommendation(value: string): Recommendation {
  const normalized = value.toLowerCase();
  if (normalized.includes("build")) return "Build";
  if (normalized.includes("validate")) return "Validate";
  if (normalized.includes("reject") || normalized.includes("archive")) return "Reject";
  if (normalized.includes("pause")) return "Paused";
  return "Watch";
}

export function assignQuadrant(market: Pick<CommitteeMarketInput, "decisionScore" | "confidence" | "hasFatalKill" | "hasTriggeredKill">): Quadrant {
  if (market.hasFatalKill || market.hasTriggeredKill || market.decisionScore < 50) return "Reject";
  if (market.decisionScore >= 75 && market.confidence >= 70) return "Build";
  if (market.decisionScore >= 65 && market.confidence < 70) return "Validate";
  if (market.decisionScore >= 50 && market.decisionScore <= 64) return "Watch";
  return market.confidence >= 70 ? "Watch" : "Validate";
}

export function recommendationSuggestion(market: CommitteeMarketInput): Recommendation {
  const quadrant = assignQuadrant(market);
  if (quadrant === "Build" && market.completeness >= 70 && market.customerValidation >= 60) return "Build";
  if (quadrant === "Reject") return "Reject";
  if (quadrant === "Validate" || market.criticalUnknownCount >= 3) return "Validate";
  return "Watch";
}

export function rankMarkets(markets: CommitteeMarketInput[]) {
  return markets
    .map((market) => ({ ...market, suggestedRecommendation: recommendationSuggestion(market), quadrant: assignQuadrant(market) }))
    .sort((a, b) => {
      if (b.decisionScore !== a.decisionScore) return b.decisionScore - a.decisionScore;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.marketScore - a.marketScore;
    });
}

export function calculateLeadershipProbability(subfactors: { score: number; weight: number }[]) {
  const totalWeight = subfactors.reduce((sum, item) => sum + item.weight, 0) || 1;
  return Math.round(subfactors.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight);
}

export function runScenario(base: ScenarioInput, adjustments: ScenarioAdjustmentInput) {
  const next = { ...base, ...adjustments };
  const decisionScore = calculateDecisionScore({
    totalMarketScore: next.totalMarketScore,
    researchConfidence: next.researchConfidence,
    researchCompleteness: next.researchCompleteness,
    customerValidation: next.customerValidation,
    competitorCoverage: next.competitorCoverage,
    executionReadiness: next.executionReadiness,
    founderFit: next.founderFit,
    criticalUnknownPenalty: next.criticalUnknownPenalty,
    killCriteriaPenalty: next.killCriteriaPenalty,
  });

  return {
    marketScore: Math.round(next.totalMarketScore),
    decisionScore,
    chanceOfBecomingNumberOne: Math.round(next.chanceOfBecomingNumberOne),
    recommendation: decisionScore >= 75 && next.researchConfidence >= 70 ? "Build" : decisionScore >= 65 ? "Validate" : decisionScore < 50 ? "Reject" : "Watch",
  };
}

export function scenarioSensitivity(base: ScenarioInput) {
  const factors: { key: keyof ScenarioInput; label: string }[] = [
    { key: "totalMarketScore", label: "Market Score" },
    { key: "researchConfidence", label: "Research Confidence" },
    { key: "researchCompleteness", label: "Research Completeness" },
    { key: "customerValidation", label: "Customer Validation" },
    { key: "competitorCoverage", label: "Competitor Coverage" },
    { key: "executionReadiness", label: "Execution Readiness" },
    { key: "founderFit", label: "Founder Fit" },
    { key: "criticalUnknownPenalty", label: "Critical Unknown Penalty" },
    { key: "killCriteriaPenalty", label: "Kill Criterion Penalty" },
  ];

  return factors.map((factor) => {
    const up = runScenario(base, { [factor.key]: Math.min(100, Number(base[factor.key]) + 10) });
    const down = runScenario(base, { [factor.key]: Math.max(0, Number(base[factor.key]) - 10) });
    return {
      ...factor,
      upsideImpact: up.decisionScore - runScenario(base, {}).decisionScore,
      downsideImpact: runScenario(base, {}).decisionScore - down.decisionScore,
    };
  }).sort((a, b) => Math.max(Math.abs(b.upsideImpact), Math.abs(b.downsideImpact)) - Math.max(Math.abs(a.upsideImpact), Math.abs(a.downsideImpact)));
}

export function decisionGap(top: CommitteeMarketInput, challenger: CommitteeMarketInput) {
  const gap = top.decisionScore - challenger.decisionScore;
  const confidenceGap = top.confidence - challenger.confidence;
  const needed = Math.max(0, gap + 1);
  return {
    totalScoreGap: top.marketScore - challenger.marketScore,
    decisionScoreGap: gap,
    confidenceGap,
    researchCompletenessGap: top.completeness - challenger.completeness,
    customerValidationGap: top.customerValidation - challenger.customerValidation,
    founderFitGap: top.founderFit - challenger.founderFit,
    executionReadinessGap: top.executionReadiness - challenger.executionReadiness,
    reversalStatement: `${challenger.name} would overtake ${top.name} if its Decision Score increased by ${needed} points, assuming all other values remain unchanged.`,
  };
}

export function categoryContributions(scores: { key: string; score: number; claims: number; opposingClaims: number; sources: number; confidence: number }[]) {
  return scoringCategories.map((category) => {
    const score = scores.find((item) => item.key === category.key);
    return {
      key: category.key,
      label: category.label,
      weight: category.weight,
      rawScore: score?.score ?? 0,
      contribution: weightedContribution(score?.score ?? 0, category.weight),
      confidence: score?.confidence ?? 0,
      supportingClaims: score?.claims ?? 0,
      opposingClaims: score?.opposingClaims ?? 0,
      verifiedSources: score?.sources ?? 0,
      frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
    };
  });
}

export function createRankingSnapshotPayload(markets: CommitteeMarketInput[], finalists: string[]) {
  const ranked = rankMarkets(markets);
  return {
    includedMarkets: markets.map((market) => market.slug),
    finalistSelection: finalists,
    rankings: ranked.map((market, index) => ({
      rank: index + 1,
      slug: market.slug,
      name: market.name,
      marketScore: market.marketScore,
      decisionScore: market.decisionScore,
      confidence: market.confidence,
      recommendation: market.recommendation,
      suggestedRecommendation: market.suggestedRecommendation,
      criticalUnknownCount: market.criticalUnknownCount,
      hasTriggeredKill: market.hasTriggeredKill,
    })),
    frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
  };
}
