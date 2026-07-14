export const CURRENT_SCORING_FRAMEWORK_VERSION = "2.0";
export const PREVIOUS_SCORING_FRAMEWORK_VERSION = "1.0";

export const scoringCategories = [
  { key: "competition", label: "Competition / White Space", weight: 25 },
  { key: "fragmentation", label: "Market Fragmentation", weight: 18 },
  { key: "stickiness", label: "Workflow Stickiness", weight: 15 },
  { key: "expansion", label: "Expansion Potential", weight: 10 },
  { key: "messenger_dependence", label: "Facebook / Messenger Dependence", weight: 7 },
  { key: "payment_flow", label: "Payment Flow Control", weight: 7 },
  { key: "market_size", label: "Market Size", weight: 5 },
  { key: "bypass_risk", label: "Bypass Risk", weight: 5 },
  { key: "data_moat", label: "Data Moat", weight: 5 },
  { key: "network_effects", label: "Network Effects", weight: 3 },
] as const;

export type ScoreCategoryKey = (typeof scoringCategories)[number]["key"];

export function getScoreCategory(key: string) {
  return scoringCategories.find((category) => category.key === key);
}

export function weightedContribution(score: number, weight: number) {
  return Number(((score * weight) / 100).toFixed(2));
}

export function calculateWeightedMarketScore(scores: { key: string; score: number }[]) {
  const total = scores.reduce((sum, score) => {
    const category = getScoreCategory(score.key);
    return sum + (category ? score.score * category.weight : 0);
  }, 0);
  return Math.round(total / 100);
}

export function scoringWeightSnapshot() {
  return scoringCategories.map((category) => ({
    key: category.key,
    label: category.label,
    weight: category.weight,
    frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
  }));
}
