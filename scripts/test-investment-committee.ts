import assert from "node:assert/strict";
import {
  assignQuadrant,
  calculateLeadershipProbability,
  createRankingSnapshotPayload,
  decisionGap,
  rankMarkets,
  recommendationSuggestion,
  runScenario,
  scenarioSensitivity,
  type CommitteeMarketInput,
} from "../src/lib/investment/calculations";

const workshop: CommitteeMarketInput = {
  slug: "workshop",
  name: "Workshop",
  status: "Deep Research",
  stage: "Investment Ready",
  marketScore: 86,
  decisionScore: 78,
  chance: 31,
  confidence: 76,
  completeness: 82,
  customerValidation: 70,
  competitorCoverage: 72,
  founderFit: 82,
  executionReadiness: 68,
  marketFragmentation: 92,
  workflowStickiness: 91,
  competitionWhiteSpace: 88,
  criticalUnknownCount: 2,
  hasFatalKill: false,
  hasTriggeredKill: false,
  recommendation: "Validate",
};

const beauty: CommitteeMarketInput = {
  ...workshop,
  slug: "beauty",
  name: "Beauty",
  marketScore: 77,
  decisionScore: 68,
  chance: 18,
  confidence: 64,
  completeness: 61,
  customerValidation: 52,
  competitorCoverage: 58,
  founderFit: 70,
  executionReadiness: 66,
  marketFragmentation: 88,
  workflowStickiness: 76,
  competitionWhiteSpace: 66,
  criticalUnknownCount: 3,
};

const lpg: CommitteeMarketInput = {
  ...workshop,
  slug: "lpg",
  name: "LPG",
  marketScore: 58,
  decisionScore: 44,
  chance: 5,
  confidence: 69,
  completeness: 63,
  hasFatalKill: true,
  hasTriggeredKill: true,
  recommendation: "Reject",
};

assert.equal(assignQuadrant(workshop), "Build", "Workshop should land in Build quadrant");
assert.equal(assignQuadrant(beauty), "Validate", "Beauty should land in Validate quadrant");
assert.equal(assignQuadrant(lpg), "Reject", "Fatal kill should force Reject quadrant");
assert.equal(recommendationSuggestion(workshop), "Build", "Build suggestion requires score, confidence, completeness, and validation");
assert.equal(recommendationSuggestion(beauty), "Validate", "Beauty should require validation first");

const ranked = rankMarkets([beauty, lpg, workshop]);
assert.deepEqual(ranked.map((market) => market.slug), ["workshop", "beauty", "lpg"], "Ranking should sort by Decision Score");

const leadership = calculateLeadershipProbability([
  { score: 80, weight: 50 },
  { score: 60, weight: 50 },
]);
assert.equal(leadership, 70, "Leadership probability should be weighted");

const scenario = runScenario({
  totalMarketScore: 86,
  researchConfidence: 76,
  researchCompleteness: 82,
  customerValidation: 70,
  competitorCoverage: 72,
  executionReadiness: 68,
  founderFit: 82,
  chanceOfBecomingNumberOne: 31,
  criticalUnknownPenalty: 4,
  killCriteriaPenalty: 0,
}, { totalMarketScore: 100, customerValidation: 100 });
assert.ok(scenario.decisionScore > workshop.decisionScore, "Scenario improvement should raise Decision Score");
assert.equal(scenario.recommendation, "Build", "Improved scenario should remain Build");

const sensitivity = scenarioSensitivity({
  totalMarketScore: 86,
  researchConfidence: 76,
  researchCompleteness: 82,
  customerValidation: 70,
  competitorCoverage: 72,
  executionReadiness: 68,
  founderFit: 82,
  chanceOfBecomingNumberOne: 31,
  criticalUnknownPenalty: 4,
  killCriteriaPenalty: 0,
});
assert.ok(sensitivity.length >= 5, "Sensitivity should include several factors");
assert.ok(sensitivity.some((item) => item.key === "totalMarketScore" && item.upsideImpact > 0), "Market score should affect sensitivity");

const gap = decisionGap(workshop, beauty);
assert.equal(gap.decisionScoreGap, 10, "Decision gap should compare top two markets");
assert.ok(gap.reversalStatement.includes("Beauty would overtake Workshop"), "Gap statement should name the challenger and leader");

const snapshot = createRankingSnapshotPayload([workshop, beauty, lpg], ["workshop", "beauty"]);
assert.equal(snapshot.rankings[0].slug, "workshop", "Snapshot should preserve ranking order");
assert.deepEqual(snapshot.finalistSelection, ["workshop", "beauty"], "Snapshot should preserve finalists");

console.log("Investment committee tests passed.");
