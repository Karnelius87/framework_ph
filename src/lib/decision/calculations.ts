import { DECISION_FORMULA_VERSION, clampScore, decisionFormula } from "@/config/decision";

export type DecisionScoreInput = {
  totalMarketScore: number;
  researchConfidence: number;
  researchCompleteness: number;
  customerValidation: number;
  competitorCoverage: number;
  executionReadiness: number;
  founderFit: number;
  criticalUnknownPenalty: number;
  killCriteriaPenalty: number;
};

export function calculateDecisionScore(input: DecisionScoreInput) {
  const base =
    input.totalMarketScore * decisionFormula.totalMarketScore +
    input.researchConfidence * decisionFormula.researchConfidence +
    input.researchCompleteness * decisionFormula.researchCompleteness +
    input.customerValidation * decisionFormula.customerValidation +
    input.competitorCoverage * decisionFormula.competitorCoverage +
    input.executionReadiness * decisionFormula.executionReadiness +
    input.founderFit * decisionFormula.founderFit;

  return clampScore(base - input.criticalUnknownPenalty - input.killCriteriaPenalty);
}

export function decisionScoreExplanation(input: DecisionScoreInput) {
  return [
    `Formula version ${DECISION_FORMULA_VERSION}`,
    `Total Market Score ${input.totalMarketScore} x ${decisionFormula.totalMarketScore}`,
    `Research Confidence ${input.researchConfidence} x ${decisionFormula.researchConfidence}`,
    `Research Completeness ${input.researchCompleteness} x ${decisionFormula.researchCompleteness}`,
    `Customer Validation ${input.customerValidation} x ${decisionFormula.customerValidation}`,
    `Competitor Coverage ${input.competitorCoverage} x ${decisionFormula.competitorCoverage}`,
    `Execution Readiness ${input.executionReadiness} x ${decisionFormula.executionReadiness}`,
    `Founder Fit ${input.founderFit} x ${decisionFormula.founderFit}`,
    `Critical Unknowns penalty -${input.criticalUnknownPenalty}`,
    `Kill Criteria penalty -${input.killCriteriaPenalty}`,
  ].join("\n");
}

export function criticalUnknownPenalty(unknowns: { importance: string; status: string; currentConfidence: number; targetConfidence: number }[]) {
  const unresolved = unknowns.filter((unknown) => !["validated", "disproven", "archived", "dismissed"].includes(unknown.status));
  const raw = unresolved.reduce((sum, unknown) => {
    const importanceWeight = unknown.importance === "critical" ? 1 : unknown.importance === "high" ? 0.7 : unknown.importance === "medium" ? 0.35 : 0.15;
    const confidenceGap = Math.max(0, unknown.targetConfidence - unknown.currentConfidence) / 100;
    return sum + importanceWeight * confidenceGap * 4;
  }, 0);
  return Math.min(decisionFormula.criticalUnknownPenaltyMax, Number(raw.toFixed(1)));
}

export function killCriteriaPenalty(criteria: { status: string; severity: string }[]) {
  const triggered = criteria.filter((criterion) => criterion.status === "triggered");
  if (triggered.length === 0) return 0;
  const severityPenalty = Math.max(...triggered.map((criterion) => (
    criterion.severity === "fatal" ? 20 : criterion.severity === "high" ? 14 : criterion.severity === "medium" ? 8 : 4
  )));
  return Math.min(decisionFormula.killCriteriaPenaltyMax, severityPenalty);
}

export function coverageSummary(coverage: { score: number; confidence: number; verifiedEvidenceCount: number }[]) {
  if (coverage.length === 0) return { completeness: 0, confidence: 0 };
  const completeness = Math.round(coverage.reduce((sum, item) => sum + item.score, 0) / coverage.length);
  const confidence = Math.round(coverage.reduce((sum, item) => sum + item.confidence, 0) / coverage.length);
  return { completeness, confidence };
}
