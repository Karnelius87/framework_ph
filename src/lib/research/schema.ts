import { z } from "zod";
import { coverageCategories } from "@/config/decision";
import { scoringCategories } from "@/config/scoring";

const scoreCategoryKeys = scoringCategories.map((category) => category.key) as [string, ...string[]];
const coverageCategoryKeys = coverageCategories.map((category) => category.key) as [string, ...string[]];

export const claimDirectionSchema = z.enum(["supporting", "opposing", "neutral"]);
export const reviewStatusSchema = z.enum(["needs_review", "verified", "rejected", "needs_validation", "incorporated"]);
export const importanceSchema = z.enum(["low", "medium", "high", "critical"]);
export const evidenceLevelSchema = z.enum(["A", "B", "C", "D"]);
export const sourceTypeSchema = z.enum([
  "government",
  "company_website",
  "competitor_website",
  "news",
  "market_report",
  "app_store",
  "review",
  "facebook",
  "interview",
  "directory",
  "academic",
  "social_media",
  "other",
]);

export const researchTopicSchema = z.enum([
  "market_structure",
  "competitors",
  "customer_journey",
  "workflow",
  "pricing",
  "willingness_to_pay",
  "payments",
  "suppliers",
  "product",
  "regulation",
  "risks",
  "go_to_market",
  "interviews",
  "investment_decision",
  "other",
]);

export const reportChapterSchema = z.enum([
  "overview",
  "market",
  "customer_research",
  "workflow",
  "competitors",
  "revenue",
  "expansion",
  "product",
  "go_to_market",
  "moat",
  "risks",
  "investment_decision",
]);

export const claimSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(8),
  category: z.enum(scoreCategoryKeys),
  direction: claimDirectionSchema,
  confidence: z.number().min(0).max(1),
  status: reviewStatusSchema.default("needs_review"),
  importance: importanceSchema,
  scoreImpact: z.number().optional(),
  sourceIds: z.array(z.string()).default([]),
  competitorIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const sourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
  publisher: z.string().min(1),
  sourceType: sourceTypeSchema,
  publishedAt: z.string().nullable().optional(),
  accessedAt: z.string().min(1),
  evidenceLevel: evidenceLevelSchema,
  credibility: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export const competitorSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1),
  website: z.string().default(""),
  country: z.string().default("Philippines"),
  targetSegment: z.string().default(""),
  threatLevel: z.enum(["Low", "Medium", "High"]).default("Medium"),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  founded: z.string().optional(),
  employees: z.string().optional(),
  funding: z.string().optional(),
  estimatedRevenue: z.string().optional(),
  estimatedCustomers: z.string().optional(),
  pricing: z.string().optional(),
});

export const assumptionSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  status: reviewStatusSchema.default("needs_review"),
  notes: z.string().optional(),
});

export const riskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: reviewStatusSchema.default("needs_review"),
  notes: z.string().optional(),
});

export const openQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.string().default("open"),
  notes: z.string().optional(),
});

export const suggestedScoreChangeSchema = z.object({
  id: z.string().min(1),
  category: z.enum(scoreCategoryKeys),
  currentScore: z.number().min(0).max(100).optional(),
  suggestedScore: z.number().min(0).max(100),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
  supportingClaimIds: z.array(z.string()).default([]),
  opposingClaimIds: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
  status: reviewStatusSchema.default("needs_review"),
});

export const reportUpdateSchema = z.object({
  id: z.string().min(1),
  chapter: reportChapterSchema,
  title: z.string().min(1),
  content: z.string().min(1),
  claimIds: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
  status: reviewStatusSchema.default("needs_review"),
});

export const criticalUnknownSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  importance: importanceSchema,
  currentConfidence: z.number().min(0).max(100),
  targetConfidence: z.number().min(0).max(100),
  status: z.enum(["open", "researching", "partially_validated", "validated", "disproven", "blocked"]).default("open"),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
  validationMethod: z.string().default("manual validation"),
  impactIfWrong: z.string().default("Decision confidence may be overstated."),
  recommendedAction: z.string().optional(),
  linkedClaims: z.array(z.string()).default([]),
  linkedSources: z.array(z.string()).default([]),
  linkedCompetitors: z.array(z.string()).default([]),
  linkedInterviews: z.array(z.string()).default([]),
});

export const killCriterionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  threshold: z.string().min(1),
  category: z.string().min(1),
  status: z.enum(["monitoring", "safe", "warning", "triggered", "dismissed"]).default("monitoring"),
  severity: z.enum(["low", "medium", "high", "fatal"]).default("medium"),
  evidenceStatus: z.enum(["hypothesis", "unverified", "verified", "disputed"]).default("hypothesis"),
  linkedClaims: z.array(z.string()).default([]),
  linkedSources: z.array(z.string()).default([]),
  reviewerNote: z.string().optional(),
});

const strategicCapabilitySchema = z.enum([
  "founder_fit",
  "distribution",
  "local_knowledge",
  "technical_advantage",
  "pricing_advantage",
  "partnership_advantage",
  "speed",
  "product_design",
  "data",
  "operational_advantage",
  "other",
]);

export const strategicAdvantageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  evidenceStatus: z.enum(["hypothesis", "unverified", "verified", "disputed"]).default("hypothesis"),
  confidence: z.number().min(0).max(100),
  linkedClaims: z.array(z.string()).default([]),
  linkedSources: z.array(z.string()).default([]),
  capabilityType: strategicCapabilitySchema.default("other"),
  defensibility: z.enum(["weak", "moderate", "strong", "compounding"]).default("weak"),
  timeHorizon: z.string().default("near_term"),
});

export const coverageUpdateSchema = z.object({
  id: z.string().optional(),
  category: z.enum(coverageCategoryKeys),
  score: z.number().min(0).max(100),
  targetScore: z.number().min(0).max(100).default(80),
  evidenceCount: z.number().int().min(0).default(0),
  verifiedEvidenceCount: z.number().int().min(0).default(0),
  confidence: z.number().min(0).max(100).default(0),
  linkedClaims: z.array(z.string()).default([]),
  linkedSources: z.array(z.string()).default([]),
  linkedInterviews: z.array(z.string()).default([]),
  gaps: z.string().default("No gap notes provided."),
  recommendedNextAction: z.string().default("Define the next research action."),
});

export const nextResearchActionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  reason: z.string().min(1),
  linkedCoverageCategory: z.string().optional(),
  linkedUnknown: z.string().optional(),
  linkedKillCriterion: z.string().optional(),
  estimatedImpact: z.number().min(0).max(100).default(0),
  expectedConfidenceImprovement: z.number().min(0).max(100).default(0),
  status: z.enum(["planned", "in_progress", "completed", "dismissed", "blocked"]).default("planned"),
  dueDate: z.string().optional(),
});

export const decisionLogEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  decision: z.string().min(1),
  rationale: z.string().min(1),
  previousValue: z.string().optional(),
  newValue: z.string().optional(),
  decisionType: z.enum(["score_change", "recommendation_change", "scope_change", "product_direction", "market_status", "research_priority", "kill_criterion", "assumption_change", "other"]).default("other"),
  linkedClaims: z.array(z.string()).default([]),
  linkedSources: z.array(z.string()).default([]),
  linkedScoreChanges: z.array(z.string()).default([]),
  linkedRisks: z.array(z.string()).default([]),
  approvedBy: z.string().default("Local Researcher"),
  reversible: z.boolean().default(true),
  reviewDate: z.string().optional(),
});

const packageCoreSchema = z.object({
  importVersion: z.enum(["1.0", "2.0"]),
  importId: z.string().min(1),
  sequenceNumber: z.number().int().positive().optional(),
  version: z.string().default("v1"),
  marketSlug: z.string().min(1),
  topic: researchTopicSchema.default("other"),
  researchDate: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  executiveSummary: z.string().optional(),
  recommendation: z.string().optional(),
  recommendationConfidence: z.number().min(0).max(1).optional(),
  researcher: z.string().min(1),
  reportMarkdown: z.string().optional(),
  claims: z.array(claimSchema).default([]),
  sources: z.array(sourceSchema).default([]),
  competitors: z.array(competitorSchema).default([]),
  assumptions: z.array(assumptionSchema).default([]),
  risks: z.array(riskSchema).default([]),
  openQuestions: z.array(openQuestionSchema).default([]),
  suggestedScoreChanges: z.array(suggestedScoreChangeSchema).default([]),
  reportUpdates: z.array(reportUpdateSchema).default([]),
  supportingEvidence: z.array(z.string()).default([]),
  opposingEvidence: z.array(z.string()).default([]),
  criticalUnknowns: z.array(criticalUnknownSchema).default([]),
  killCriteria: z.array(killCriterionSchema).default([]),
  whyWeWin: z.array(strategicAdvantageSchema).default([]),
  whyWeMayLose: z.array(strategicAdvantageSchema).default([]),
  nextResearchActions: z.array(nextResearchActionSchema).default([]),
  coverageUpdates: z.array(coverageUpdateSchema).default([]),
  decisionLogEntries: z.array(decisionLogEntrySchema).default([]),
});

const scoreCategoryMap = new Set<string>(scoringCategories.map((category) => category.key));
const reviewStatuses = new Set(["needs_review", "verified", "rejected", "needs_validation", "incorporated"]);
const evidenceStatuses = new Set(["hypothesis", "unverified", "verified", "disputed"]);
const decisionTypes = new Set(["score_change", "recommendation_change", "scope_change", "product_direction", "market_status", "research_priority", "kill_criterion", "assumption_change", "other"]);

function arrayInput(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function firstString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function idList(value: unknown) {
  return arrayInput(value)
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return firstString(record.id)
          ?? firstString(record.claimId)
          ?? firstString(record.sourceId)
          ?? firstString(record.externalId)
          ?? firstString(record.title);
      }
      return undefined;
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeReviewStatus(value: unknown) {
  const status = String(value ?? "");
  return reviewStatuses.has(status) ? status : "needs_review";
}

function normalizeEvidenceStatus(value: unknown) {
  const status = String(value ?? "");
  if (evidenceStatuses.has(status)) return status;
  if (status === "supported") return "verified";
  if (status === "needs_validation" || status === "needs_review") return "unverified";
  return "hypothesis";
}

function normalizeScoreCategory(value: unknown) {
  const category = String(value ?? "");
  if (scoreCategoryMap.has(category)) return category;
  if (["unit_economics", "supplier_ecosystem", "pricing", "suppliers"].includes(category)) return "expansion";
  if (category === "payments" || category === "payment_flows") return "payment_flow";
  if (category === "customer_workflow" || category === "product_adoption") return "stickiness";
  return "expansion";
}

function normalizeUrl(value: unknown, id: unknown) {
  const url = firstString(value);
  if (!url) return `local://research/${String(id ?? "source")}`;
  const markdownLink = url.match(/^\[(?:[^\]]+)\]\(([^)]+)\)$/);
  return markdownLink?.[1] ?? url;
}

function normalizePercent(value: unknown, fallback = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function normalizeProbability(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.max(0, Math.min(1, value > 1 ? value / 100 : value));
}

function actionImpact(item: Record<string, unknown>) {
  if (typeof item.estimatedImpact === "number") return normalizePercent(item.estimatedImpact);
  if (item.priority === "critical") return 9;
  if (item.priority === "high") return 7;
  if (item.priority === "medium") return 4;
  return 2;
}

function normalizeResearchPackageInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const importVersion = input.importVersion === "2.0" ? "2.0" : "1.0";
  const updatedScores = Array.isArray(input.updatedScores) ? input.updatedScores : input.suggestedScoreChanges;
  const marketSlug = typeof input.marketSlug === "string" ? input.marketSlug : typeof input.market === "string" ? input.market : "";
  const executiveSummary = typeof input.executiveSummary === "string" ? input.executiveSummary : undefined;

  return {
    ...input,
    importVersion,
    marketSlug,
    version: typeof input.version === "string" ? input.version : typeof input.packageVersion === "string" ? input.packageVersion : "v1",
    topic: typeof input.topic === "string" ? input.topic : "other",
    title: typeof input.title === "string" ? input.title : `Research Package ${input.importId ?? ""}`,
    summary: typeof input.summary === "string" ? input.summary : executiveSummary ?? "No summary provided.",
    executiveSummary,
    sources: arrayInput(input.sources).map((source) => {
      const item = source as Record<string, unknown>;
      return { ...item, url: normalizeUrl(item.url, item.id) };
    }),
    claims: arrayInput(input.claims).map((claim) => {
      const item = claim as Record<string, unknown>;
      return { ...item, category: normalizeScoreCategory(item.category), status: normalizeReviewStatus(item.status) };
    }),
    assumptions: arrayInput(input.assumptions).map((assumption) => {
      const item = assumption as Record<string, unknown>;
      return {
        ...item,
        statement: item.statement ?? ([item.title, item.description].filter(Boolean).join(": ") || "Assumption needs validation."),
        confidence: normalizeProbability(item.confidence),
        status: normalizeReviewStatus(item.status),
        notes: item.notes ?? item.description,
      };
    }),
    risks: arrayInput(input.risks).map((risk) => {
      const item = risk as Record<string, unknown>;
      return { ...item, status: normalizeReviewStatus(item.status) };
    }),
    suggestedScoreChanges: arrayInput(updatedScores)
      .filter((change) => typeof (change as Record<string, unknown>).suggestedScore === "number")
      .map((change) => {
        const item = change as Record<string, unknown>;
        return {
          ...item,
          category: normalizeScoreCategory(item.category),
          currentScore: typeof item.currentScore === "number" ? item.currentScore : undefined,
          status: normalizeReviewStatus(item.status),
        };
      }),
    supportingEvidence: idList(input.supportingEvidence),
    opposingEvidence: idList(input.opposingEvidence),
    criticalUnknowns: arrayInput(input.criticalUnknowns).map((unknown) => {
      const item = unknown as Record<string, unknown>;
      return { ...item, linkedSources: item.linkedSources ?? item.sourceIds ?? [], linkedClaims: item.linkedClaims ?? item.claimIds ?? [] };
    }),
    killCriteria: arrayInput(input.killCriteria).map((criterion) => {
      const item = criterion as Record<string, unknown>;
      return {
        ...item,
        evidenceStatus: normalizeEvidenceStatus(item.evidenceStatus),
        linkedSources: item.linkedSources ?? item.sourceIds ?? [],
        linkedClaims: item.linkedClaims ?? item.claimIds ?? [],
      };
    }),
    whyWeWin: arrayInput(input.whyWeWin).map((advantage) => {
      const item = advantage as Record<string, unknown>;
      return {
        ...item,
        evidenceStatus: normalizeEvidenceStatus(item.evidenceStatus),
        linkedClaims: item.linkedClaims ?? item.claimIds ?? [],
        linkedSources: item.linkedSources ?? item.sourceIds ?? [],
      };
    }),
    whyWeMayLose: arrayInput(input.whyWeMayLose).map((disadvantage) => {
      const item = disadvantage as Record<string, unknown>;
      return {
        ...item,
        evidenceStatus: normalizeEvidenceStatus(item.evidenceStatus),
        linkedClaims: item.linkedClaims ?? item.claimIds ?? [],
        linkedSources: item.linkedSources ?? item.sourceIds ?? [],
      };
    }),
    nextResearchActions: arrayInput(input.nextResearchActions).map((action) => {
      const item = action as Record<string, unknown>;
      const impact = actionImpact(item);
      return {
        ...item,
        estimatedImpact: impact,
        expectedConfidenceImprovement: typeof item.expectedConfidenceImprovement === "number" ? normalizePercent(item.expectedConfidenceImprovement) : impact,
        linkedUnknown: item.linkedUnknown ?? idList(item.linkedUnknownIds)[0],
        linkedKillCriterion: item.linkedKillCriterion ?? idList(item.linkedKillCriterionIds)[0],
      };
    }),
    coverageUpdates: arrayInput(input.coverageUpdates).map((coverage) => {
      const item = coverage as Record<string, unknown>;
      return {
        ...item,
        gaps: Array.isArray(item.gaps) ? item.gaps.join("; ") : item.gaps,
        recommendedNextAction: item.recommendedNextAction ?? item.recommendedNextResearchAction ?? "Define the next research action.",
        confidence: typeof item.confidence === "number"
          ? normalizePercent(item.confidence)
          : Math.round(((typeof item.verifiedEvidenceCount === "number" ? item.verifiedEvidenceCount : 0) / Math.max(1, typeof item.evidenceCount === "number" ? item.evidenceCount : 1)) * 100),
      };
    }),
    decisionLogEntries: arrayInput(input.decisionLogEntries).map((entry) => {
      const item = entry as Record<string, unknown>;
      const rawType = String(item.decisionType ?? item.type ?? "other");
      return {
        ...item,
        decision: item.decision ?? item.description ?? item.newValue ?? item.title,
        rationale: item.rationale ?? item.description ?? "Research package decision note.",
        previousValue: item.previousValue === null ? undefined : item.previousValue,
        decisionType: decisionTypes.has(rawType) ? rawType : "other",
        linkedClaims: item.linkedClaims ?? item.linkedClaimIds ?? [],
        linkedSources: item.linkedSources ?? item.linkedSourceIds ?? [],
        linkedScoreChanges: item.linkedScoreChanges ?? item.linkedScoreChangeIds ?? [],
        linkedRisks: item.linkedRisks ?? item.linkedRiskIds ?? [],
      };
    }),
    reportUpdates: arrayInput(input.reportUpdates).map((update) => {
      const item = update as Record<string, unknown>;
      return { ...item, status: normalizeReviewStatus(item.status), claimIds: item.claimIds ?? item.linkedClaims ?? [], sourceIds: item.sourceIds ?? item.linkedSources ?? [] };
    }),
  };
}

export const researchPackageSchema = z.preprocess(normalizeResearchPackageInput, packageCoreSchema);

export type ResearchPackage = z.infer<typeof researchPackageSchema>;

export const importTemplate: ResearchPackage = {
  importVersion: "2.0",
  importId: "RP-0001",
  version: "v1",
  marketSlug: "workshop",
  topic: "investment_decision",
  researchDate: "2026-07-12",
  title: "Workshop investment decision update",
  summary: "Structured research package for manual review.",
  executiveSummary: "Demo / Hypothesis - Workshop remains attractive but decision confidence depends on free workflow adoption, usable demand data, and later supplier or transaction monetization validation.",
  recommendation: "Continue deep research",
  recommendationConfidence: 0.62,
  researcher: "ChatGPT",
  reportMarkdown: "## Readable report\n\nPaste the human-readable research report here.",
  claims: [
    {
      id: "claim-workshop-001",
      statement: "The workshop thesis depends on fragmented operators with repeated weekly workflow pain.",
      category: "fragmentation",
      direction: "supporting",
      confidence: 0.62,
      status: "needs_review",
      importance: "high",
      scoreImpact: 0.4,
      sourceIds: ["source-001"],
      competitorIds: [],
      notes: "Demo / Hypothesis - requires interview validation",
    },
  ],
  sources: [
    {
      id: "source-001",
      title: "Workshop interview plan",
      url: "local://research-plan/workshop-interviews",
      publisher: "Internal Research",
      sourceType: "interview",
      publishedAt: null,
      accessedAt: "2026-07-12",
      evidenceLevel: "C",
      credibility: 0.5,
      notes: "Demo / Hypothesis - planned research artifact",
    },
  ],
  competitors: [],
  assumptions: [],
  risks: [],
  openQuestions: [],
  suggestedScoreChanges: [
    {
      id: "score-workshop-001",
      category: "competition",
      currentScore: 88,
      suggestedScore: 84,
      reason: "Demo / Hypothesis - competitor coverage is not yet strong enough to keep the higher score.",
      confidence: 0.52,
      supportingClaimIds: ["claim-workshop-001"],
      opposingClaimIds: [],
      sourceIds: ["source-001"],
      status: "needs_review",
    },
  ],
  supportingEvidence: ["claim-workshop-001"],
  opposingEvidence: [],
  criticalUnknowns: [
    {
      id: "unknown-workshop-demand-data",
      title: "Can free workflow usage produce reliable demand data?",
      description: "Demo / Hypothesis - product categories, quantities, and repeat purchasing signals are still not validated.",
      category: "demand_data_quality",
      importance: "critical",
      currentConfidence: 25,
      targetConfidence: 80,
      status: "open",
      validationMethod: "Pilot usage instrumentation",
      impactIfWrong: "Supplier monetization may be too weak even if workflow adoption is strong.",
      recommendedAction: "Approve the free MVP scope and validate demand-data capture in pilot workshops.",
      linkedClaims: [],
      linkedSources: [],
      linkedCompetitors: [],
      linkedInterviews: [],
    },
  ],
  killCriteria: [
    {
      id: "kill-workshop-low-adoption",
      title: "Low Product Adoption",
      description: "Demo / Hypothesis - free adoption fails if onboarded workshops do not use the core workflow weekly.",
      threshold: "Fewer than 25% of onboarded pilot workshops use the core workflow weekly after 60 days.",
      category: "product_adoption",
      status: "monitoring",
      severity: "fatal",
      evidenceStatus: "hypothesis",
      linkedClaims: [],
      linkedSources: [],
    },
  ],
  whyWeWin: [],
  whyWeMayLose: [],
  nextResearchActions: [],
  coverageUpdates: [],
  decisionLogEntries: [],
  reportUpdates: [],
};
