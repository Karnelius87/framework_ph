export const DECISION_FORMULA_VERSION = "1.0";

export const decisionFormula = {
  totalMarketScore: 0.45,
  researchConfidence: 0.15,
  researchCompleteness: 0.1,
  customerValidation: 0.1,
  competitorCoverage: 0.05,
  executionReadiness: 0.05,
  founderFit: 0.1,
  criticalUnknownPenaltyMax: 10,
  killCriteriaPenaltyMax: 20,
} as const;

export const coverageCategories = [
  { key: "market_structure", label: "Market Structure", targetScore: 80 },
  { key: "customer_workflow", label: "Customer Workflow", targetScore: 80 },
  { key: "customer_validation", label: "Customer Validation", targetScore: 85 },
  { key: "competition", label: "Competition", targetScore: 85 },
  { key: "pricing", label: "Pricing", targetScore: 80 },
  { key: "willingness_to_pay", label: "Willingness to Pay", targetScore: 85 },
  { key: "payment_flows", label: "Payment Flows", targetScore: 75 },
  { key: "supplier_ecosystem", label: "Supplier Ecosystem", targetScore: 70 },
  { key: "product_adoption", label: "Product Adoption", targetScore: 80 },
  { key: "regulation", label: "Regulation", targetScore: 70 },
  { key: "technical_feasibility", label: "Technical Feasibility", targetScore: 75 },
  { key: "go_to_market", label: "Go To Market", targetScore: 80 },
  { key: "interviews", label: "Interviews", targetScore: 85 },
  { key: "unit_economics", label: "Unit Economics", targetScore: 75 },
  { key: "expansion", label: "Expansion", targetScore: 75 },
  { key: "risks", label: "Risks", targetScore: 80 },
] as const;

export const freshnessRules = [
  { key: "competitor_pricing", label: "Competitor pricing", targetType: "competitor_pricing", staleAfterDays: 90 },
  { key: "competitor_features", label: "Competitor features", targetType: "competitor_features", staleAfterDays: 120 },
  { key: "regulations", label: "Regulations", targetType: "regulation", staleAfterDays: 180 },
  { key: "market_size", label: "Market size", targetType: "market_size", staleAfterDays: 365 },
  { key: "interview_insight", label: "Interview insight", targetType: "interview", staleAfterDays: 365 },
  { key: "company_funding_or_employee_count", label: "Company funding or employee count", targetType: "company_profile", staleAfterDays: 180 },
] as const;

export type CoverageCategoryKey = (typeof coverageCategories)[number]["key"];

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
