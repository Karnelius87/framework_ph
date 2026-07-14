"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { recomputeDecisionMetric } from "@/lib/research/persistence";

export type StrategicMetricsPayload = {
  founderFit: {
    score: number;
    domainKnowledge: number;
    localAccess: number;
    technicalCapability: number;
    salesCapability: number;
    distributionAccess: number;
    capitalRequirementFit: number;
    operationalFit: number;
    explanation: string;
  };
  executionReadiness: {
    score: number;
    customerAccess: number;
    prototypeReadiness: number;
    regulatoryReadiness: number;
    dataAvailability: number;
    integrationComplexity: number;
    onboardingComplexity: number;
    timeToMvp: number;
    costToValidate: number;
    explanation: string;
  };
  leadership: {
    chance: number;
    competitiveIntensity: number;
    marketFragmentation: number;
    incumbentStrength: number;
    localizationAdvantage: number;
    distributionDifficulty: number;
    switchingBarriers: number;
    speedAdvantage: number;
    explanation: string;
  };
};

export async function saveStrategicMetricsAction(slug: string, payload: StrategicMetricsPayload) {
  const db = getDb();
  const market = await db.market.findUnique({ where: { slug } });
  if (!market) return { success: false as const, error: "Market not found." };

  const founderFit = normalizeFounderFit(payload.founderFit);
  const executionReadiness = normalizeExecutionReadiness(payload.executionReadiness);
  const leadership = normalizeLeadership(payload.leadership);

  await db.founderFitMetric.upsert({
    where: { marketId: market.id },
    create: { marketId: market.id, ...founderFit },
    update: founderFit,
  });

  await db.executionReadinessMetric.upsert({
    where: { marketId: market.id },
    create: { marketId: market.id, ...executionReadiness },
    update: executionReadiness,
  });

  await db.marketLeadershipMetric.upsert({
    where: { marketId: market.id },
    create: { marketId: market.id, ...leadership },
    update: leadership,
  });

  await recomputeDecisionMetric(db, market.id);
  const decisionMetric = await db.decisionMetric.findUnique({ where: { marketId: market.id } });

  await db.decisionLog.create({
    data: {
      externalId: `strategic-metrics-${slug}-${Date.now()}`,
      marketId: market.id,
      title: "Strategic metrics updated",
      decision: `Founder Fit ${founderFit.score}, Execution ${executionReadiness.score}, #1 Chance ${leadership.chance}`,
      rationale: "Manual local update to strategic metrics used by Decision Score.",
      previousValue: null,
      newValue: decisionMetric ? `Decision Score ${Math.round(decisionMetric.decisionScore)}` : null,
      decisionType: "other",
      linkedClaims: "[]",
      linkedSources: "[]",
      linkedScoreChanges: "[]",
      linkedRisks: "[]",
      approvedBy: "Local Researcher",
      reversible: true,
    },
  });

  revalidatePath(`/markets/${slug}`);
  revalidatePath(`/markets/${slug}/metrics`);
  revalidatePath("/markets");
  revalidatePath("/investment-committee");
  revalidatePath("/decisions");

  return {
    success: true as const,
    decisionScore: decisionMetric ? Math.round(decisionMetric.decisionScore) : null,
    founderFitScore: founderFit.score,
    executionReadinessScore: executionReadiness.score,
    chanceOfBecomingNumberOne: leadership.chance,
  };
}

function normalizeFounderFit(input: StrategicMetricsPayload["founderFit"]) {
  return {
    score: score(input.score),
    domainKnowledge: score(input.domainKnowledge),
    localAccess: score(input.localAccess),
    technicalCapability: score(input.technicalCapability),
    salesCapability: score(input.salesCapability),
    distributionAccess: score(input.distributionAccess),
    capitalRequirementFit: score(input.capitalRequirementFit),
    operationalFit: score(input.operationalFit),
    explanation: cleanExplanation(input.explanation, "Manual founder-fit estimate."),
  };
}

function normalizeExecutionReadiness(input: StrategicMetricsPayload["executionReadiness"]) {
  return {
    score: score(input.score),
    customerAccess: score(input.customerAccess),
    prototypeReadiness: score(input.prototypeReadiness),
    regulatoryReadiness: score(input.regulatoryReadiness),
    dataAvailability: score(input.dataAvailability),
    integrationComplexity: score(input.integrationComplexity),
    onboardingComplexity: score(input.onboardingComplexity),
    timeToMvp: score(input.timeToMvp),
    costToValidate: score(input.costToValidate),
    explanation: cleanExplanation(input.explanation, "Manual execution-readiness estimate."),
  };
}

function normalizeLeadership(input: StrategicMetricsPayload["leadership"]) {
  return {
    chance: score(input.chance),
    competitiveIntensity: score(input.competitiveIntensity),
    marketFragmentation: score(input.marketFragmentation),
    incumbentStrength: score(input.incumbentStrength),
    localizationAdvantage: score(input.localizationAdvantage),
    distributionDifficulty: score(input.distributionDifficulty),
    switchingBarriers: score(input.switchingBarriers),
    speedAdvantage: score(input.speedAdvantage),
    explanation: cleanExplanation(input.explanation, "Manual market leadership estimate."),
  };
}

function score(value: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function cleanExplanation(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
}
