/* global console, process */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./data/local.db" });
const db = new PrismaClient({ adapter });

const ARCHIVED_NOTE = "Archived - superseded business-model assumption";

const newKillCriteria = [
  {
    externalId: "workshop-kill-low-adoption",
    title: "Low Product Adoption",
    description: "Free adoption fails if onboarded workshops do not use the core workflow weekly.",
    threshold: "Fewer than 25% of onboarded pilot workshops use the core workflow weekly after 60 days.",
    category: "product_adoption",
    status: "monitoring",
    severity: "fatal",
  },
  {
    externalId: "workshop-kill-demand-data",
    title: "Insufficient Demand Data",
    description: "Supplier monetization needs reliable product category, quantity, and parts data.",
    threshold: "Workshops do not record product categories, quantities, or parts consistently enough to create reliable aggregated demand signals.",
    category: "demand_data_quality",
    status: "monitoring",
    severity: "high",
  },
  {
    externalId: "workshop-kill-transaction-conversion",
    title: "Low Transaction Conversion",
    description: "Demand signals must turn into supplier-attributed transaction intent.",
    threshold: "Fewer than 10% of active pilot workshops complete or explicitly commit to a portal-attributed supplier purchase during the validation period.",
    category: "transaction_conversion",
    status: "monitoring",
    severity: "high",
  },
  {
    externalId: "workshop-kill-no-supplier-monetization",
    title: "No Supplier Monetization",
    description: "Supplier economics must be commercially real before expansion is included in the case.",
    threshold: "None of three qualified suppliers offers a referral fee, rebate, campaign budget, differentiated quote tier, or transaction-based commercial model.",
    category: "supplier_monetization",
    status: "monitoring",
    severity: "high",
  },
  {
    externalId: "workshop-kill-negative-transaction-economics",
    title: "Negative Transaction Economics",
    description: "Supplier or resale margin must survive operational costs.",
    threshold: "Delivery, payment, support, returns, taxes, credit losses, and operational costs consume the available supplier or resale margin.",
    category: "transaction_economics",
    status: "monitoring",
    severity: "fatal",
  },
];

const replacementCoverage = [
  {
    category: "product_adoption",
    label: "Product Adoption",
    score: 35,
    targetScore: 85,
    evidenceCount: 1,
    verifiedEvidenceCount: 0,
    confidence: 25,
    gaps: "Free workflow adoption is still unproven.",
    recommendedNextAction: "Approve the free Workshop MVP scope and build a pitchable demo.",
  },
  {
    category: "demand_data_quality",
    label: "Demand Data Quality",
    score: 20,
    targetScore: 80,
    evidenceCount: 0,
    verifiedEvidenceCount: 0,
    confidence: 20,
    gaps: "Need proof that jobs include usable product categories, quantities, and repeat purchasing signals.",
    recommendedNextAction: "Instrument the MVP and pilot usage for product-line-item completeness.",
  },
  {
    category: "transaction_conversion",
    label: "Transaction Conversion",
    score: 0,
    targetScore: 70,
    evidenceCount: 0,
    verifiedEvidenceCount: 0,
    confidence: 0,
    gaps: "No portal-attributed supplier purchase intent or transaction data yet.",
    recommendedNextAction: "Measure supplier link opens, quote requests, first purchases, and repeat purchases after pilot usage.",
  },
  {
    category: "supplier_monetization",
    label: "Supplier Monetization",
    score: 0,
    targetScore: 70,
    evidenceCount: 0,
    verifiedEvidenceCount: 0,
    confidence: 0,
    gaps: "No supplier referral-fee, rebate, campaign-budget, quote-tier, or transaction-fee offers yet.",
    recommendedNextAction: "Contact qualified suppliers after real demand data exists.",
  },
];

function isSubscriptionWtp(text) {
  const lower = text.toLowerCase();
  return lower.includes("php 500") || lower.includes("php 1,500") || lower.includes("php 1500") || lower.includes("willingness to pay");
}

async function upsertByExternalId(model, marketId, row) {
  const existing = await model.findFirst({ where: { marketId, externalId: row.externalId } });
  if (existing) {
    await model.update({ where: { id: existing.id }, data: row });
    return;
  }
  await model.create({ data: { ...row, marketId } });
}

async function main() {
  const market = await db.market.findUnique({ where: { slug: "workshop" } });
  if (!market) throw new Error("Workshop market not found.");

  await db.market.update({
    where: { id: market.id },
    data: { recommendation: "Define and Build Free MVP" },
  });

  const unknowns = await db.criticalUnknown.findMany({ where: { marketId: market.id } });
  for (const unknown of unknowns.filter((item) => isSubscriptionWtp(`${item.title} ${item.description} ${item.recommendedAction ?? ""}`))) {
    await db.criticalUnknown.update({
      where: { id: unknown.id },
      data: {
        status: "archived",
        importance: "medium",
        validationMethod: ARCHIVED_NOTE,
        recommendedAction: ARCHIVED_NOTE,
        impactIfWrong: "No longer controls the Workshop thesis.",
        resolvedAt: unknown.resolvedAt ?? new Date(),
      },
    });
  }

  await upsertByExternalId(db.criticalUnknown, market.id, {
    externalId: "workshop-unknown-demand-data",
    title: "Can free workflow usage produce reliable demand data?",
    description: "The free MVP must capture product categories, quantities, and repeat purchasing signals before supplier monetization can be validated.",
    category: "demand_data_quality",
    importance: "critical",
    currentConfidence: 20,
    targetConfidence: 80,
    status: "open",
    validationMethod: "Pilot usage instrumentation",
    impactIfWrong: "Supplier monetization may not be possible even if workflow adoption is strong.",
    recommendedAction: "Build demo and validate data capture in pilot workshops.",
  });

  const killCriteria = await db.killCriterion.findMany({ where: { marketId: market.id } });
  for (const criterion of killCriteria.filter((item) => isSubscriptionWtp(`${item.title} ${item.description} ${item.threshold}`))) {
    await db.killCriterion.update({
      where: { id: criterion.id },
      data: {
        status: "archived",
        severity: "archived",
        threshold: ARCHIVED_NOTE,
        reviewerNote: "Archived - the Workshop thesis changed from subscription-first SaaS to free workflow adoption with downstream supplier and transaction monetization.",
        resolvedAt: criterion.resolvedAt ?? new Date(),
      },
    });
  }

  for (const criterion of newKillCriteria) {
    await upsertByExternalId(db.killCriterion, market.id, {
      ...criterion,
      evidenceStatus: "hypothesis",
      reviewerNote: "Demo / Hypothesis. No automatic rejection; manual decision approval required.",
    });
  }

  const wtpCoverage = await db.researchCoverage.findFirst({ where: { marketId: market.id, category: "willingness_to_pay" } });
  if (wtpCoverage) {
    await db.researchCoverage.update({
      where: { id: wtpCoverage.id },
      data: {
        label: "Archived Subscription WTP",
        gaps: ARCHIVED_NOTE,
        recommendedNextAction: ARCHIVED_NOTE,
        freshnessStatus: "archived",
      },
    });
  }

  for (const coverage of replacementCoverage) {
    await db.researchCoverage.upsert({
      where: { marketId_category: { marketId: market.id, category: coverage.category } },
      create: {
        marketId: market.id,
        ...coverage,
        linkedClaimsCount: 0,
        linkedSourcesCount: 0,
        linkedInterviewsCount: 0,
        freshnessStatus: "current",
      },
      update: {
        ...coverage,
        freshnessStatus: "current",
      },
    });
  }

  const researchActions = await db.researchAction.findMany({ where: { marketId: market.id } });
  for (const action of researchActions.filter((item) => isSubscriptionWtp(`${item.title} ${item.description} ${item.reason}`))) {
    await db.researchAction.update({
      where: { id: action.id },
      data: {
        priority: "low",
        status: "dismissed",
        estimatedImpact: 0,
        expectedConfidenceImprovement: 0,
        reason: ARCHIVED_NOTE,
      },
    });
  }

  await upsertByExternalId(db.researchAction, market.id, {
    externalId: "workshop-action-free-mvp-scope",
    title: "Approve the free Workshop MVP scope and build a pitchable demo",
    description: "Lock the free V1 workflow before outreach, pilots, or supplier economics.",
    priority: "critical",
    reason: "Current Workshop thesis depends on free workflow adoption and usable demand data, not subscription WTP.",
    linkedCoverageCategory: "product_adoption",
    linkedUnknownId: null,
    linkedKillCriterionId: null,
    estimatedImpact: 10,
    expectedConfidenceImprovement: 18,
    status: "planned",
    dueDate: null,
    completedAt: null,
  });

  const decisionExternalId = "workshop-decision-free-first-thesis";
  const existingDecision = await db.decisionLog.findFirst({ where: { marketId: market.id, externalId: decisionExternalId } });
  if (!existingDecision) {
    await db.decisionLog.create({
      data: {
        externalId: decisionExternalId,
        marketId: market.id,
        title: "Workshop thesis changed to free-first workflow adoption",
        decision: "The Workshop thesis changed from subscription-first SaaS to free workflow adoption with downstream supplier and transaction monetization.",
        rationale: "PHP 500 / PHP 1,500 monthly willingness-to-pay should no longer be a fatal market criterion. The current validation path is free MVP adoption, demand-data quality, transaction conversion, and supplier monetization.",
        previousValue: "Subscription-first SaaS willingness-to-pay validation",
        newValue: "Free workflow adoption with downstream supplier and transaction monetization",
        decisionType: "product_direction",
        linkedClaims: "[]",
        linkedSources: "[]",
        linkedScoreChanges: "[]",
        linkedRisks: "[]",
        approvedBy: "Codex",
        reversible: true,
      },
    });
  }

  const decisionMetric = await db.decisionMetric.findUnique({ where: { marketId: market.id } });
  if (decisionMetric) {
    const activeUnknowns = await db.criticalUnknown.findMany({ where: { marketId: market.id, NOT: { status: { in: ["validated", "disproven", "archived", "dismissed"] } } } });
    const activeTriggeredKills = await db.killCriterion.findMany({ where: { marketId: market.id, status: "triggered", NOT: { severity: "archived" } } });
    const unknownPenalty = Math.min(10, Number(activeUnknowns.reduce((sum, unknown) => {
      const importanceWeight = unknown.importance === "critical" ? 1 : unknown.importance === "high" ? 0.7 : unknown.importance === "medium" ? 0.35 : 0.15;
      const confidenceGap = Math.max(0, unknown.targetConfidence - unknown.currentConfidence) / 100;
      return sum + importanceWeight * confidenceGap * 4;
    }, 0).toFixed(1)));
    const killPenalty = activeTriggeredKills.length
      ? Math.min(20, Math.max(...activeTriggeredKills.map((criterion) => criterion.severity === "fatal" ? 20 : criterion.severity === "high" ? 14 : criterion.severity === "medium" ? 8 : 4)))
      : 0;
    const base =
      decisionMetric.totalMarketScore * 0.45 +
      decisionMetric.confidence * 0.15 +
      decisionMetric.researchCompleteness * 0.1 +
      decisionMetric.customerValidation * 0.1 +
      decisionMetric.competitorCoverage * 0.05 +
      decisionMetric.executionReadiness * 0.05 +
      decisionMetric.founderFit * 0.1;
    await db.decisionMetric.update({
      where: { id: decisionMetric.id },
      data: {
        criticalUnknownPenalty: unknownPenalty,
        killCriteriaPenalty: killPenalty,
        decisionScore: Math.max(0, Math.min(100, Math.round(base - unknownPenalty - killPenalty))),
        explanation: [
          "Formula version 1.0",
          `Total Market Score ${decisionMetric.totalMarketScore} x 0.45`,
          `Research Confidence ${decisionMetric.confidence} x 0.15`,
          `Research Completeness ${decisionMetric.researchCompleteness} x 0.1`,
          `Customer Validation ${decisionMetric.customerValidation} x 0.1`,
          `Competitor Coverage ${decisionMetric.competitorCoverage} x 0.05`,
          `Execution Readiness ${decisionMetric.executionReadiness} x 0.05`,
          `Founder Fit ${decisionMetric.founderFit} x 0.1`,
          `Critical Unknowns penalty -${unknownPenalty}`,
          `Kill Criteria penalty -${killPenalty}`,
        ].join("\n"),
      },
    });
  }
}

main()
  .then(async () => {
    console.log("Workshop free-first MVP thesis repair complete.");
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
