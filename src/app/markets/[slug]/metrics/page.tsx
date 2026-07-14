import { SlidersHorizontal } from "lucide-react";
import { notFound } from "next/navigation";
import { MetricsEditorClient } from "@/app/markets/[slug]/metrics/metrics-editor-client";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getMarket, markets } from "@/data/research";
import { getDb } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return markets.map((market) => ({ slug: market.slug }));
}

export default async function StrategicMetricsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staticMarket = getMarket(slug);
  if (!staticMarket) notFound();

  const dbMarket = await getDb().market.findUnique({
    where: { slug },
    include: {
      decisionMetric: true,
      founderFitMetric: true,
      executionReadinessMetric: true,
      leadershipMetric: true,
    },
  });

  const initialMetrics = {
    founderFit: dbMarket?.founderFitMetric ? {
      score: dbMarket.founderFitMetric.score,
      domainKnowledge: dbMarket.founderFitMetric.domainKnowledge,
      localAccess: dbMarket.founderFitMetric.localAccess,
      technicalCapability: dbMarket.founderFitMetric.technicalCapability,
      salesCapability: dbMarket.founderFitMetric.salesCapability,
      distributionAccess: dbMarket.founderFitMetric.distributionAccess,
      capitalRequirementFit: dbMarket.founderFitMetric.capitalRequirementFit,
      operationalFit: dbMarket.founderFitMetric.operationalFit,
      explanation: dbMarket.founderFitMetric.explanation,
    } : defaultFounderFit(staticMarket),
    executionReadiness: dbMarket?.executionReadinessMetric ? {
      score: dbMarket.executionReadinessMetric.score,
      customerAccess: dbMarket.executionReadinessMetric.customerAccess,
      prototypeReadiness: dbMarket.executionReadinessMetric.prototypeReadiness,
      regulatoryReadiness: dbMarket.executionReadinessMetric.regulatoryReadiness,
      dataAvailability: dbMarket.executionReadinessMetric.dataAvailability,
      integrationComplexity: dbMarket.executionReadinessMetric.integrationComplexity,
      onboardingComplexity: dbMarket.executionReadinessMetric.onboardingComplexity,
      timeToMvp: dbMarket.executionReadinessMetric.timeToMvp,
      costToValidate: dbMarket.executionReadinessMetric.costToValidate,
      explanation: dbMarket.executionReadinessMetric.explanation,
    } : defaultExecutionReadiness(staticMarket),
    leadership: dbMarket?.leadershipMetric ? {
      chance: dbMarket.leadershipMetric.chance,
      competitiveIntensity: dbMarket.leadershipMetric.competitiveIntensity,
      marketFragmentation: dbMarket.leadershipMetric.marketFragmentation,
      incumbentStrength: dbMarket.leadershipMetric.incumbentStrength,
      localizationAdvantage: dbMarket.leadershipMetric.localizationAdvantage,
      distributionDifficulty: dbMarket.leadershipMetric.distributionDifficulty,
      switchingBarriers: dbMarket.leadershipMetric.switchingBarriers,
      speedAdvantage: dbMarket.leadershipMetric.speedAdvantage,
      explanation: dbMarket.leadershipMetric.explanation,
    } : defaultLeadership(staticMarket),
  };

  return (
    <div>
      <PageHeader
        title={`${staticMarket.name} Strategic Metrics`}
        description="Edit Founder Fit, Execution Readiness, and Chance of Becoming #1. Saving recalculates Decision Score immediately."
        icon={SlidersHorizontal}
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/markets/${slug}`}>Back to Market</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/investment-committee">Committee</Link>
          </>
        }
      />
      <div className="p-4 lg:p-6">
        <MetricsEditorClient
          slug={slug}
          marketName={staticMarket.name}
          initialMetrics={initialMetrics}
          initialDecisionScore={dbMarket?.decisionMetric?.decisionScore ?? staticMarket.score}
        />
      </div>
    </div>
  );
}

function defaultFounderFit(market: NonNullable<ReturnType<typeof getMarket>>) {
  return {
    score: market.confidence,
    domainKnowledge: market.confidence,
    localAccess: market.confidence,
    technicalCapability: 70,
    salesCapability: market.confidence,
    distributionAccess: market.confidence,
    capitalRequirementFit: market.completeness,
    operationalFit: market.completeness,
    explanation: "Manual founder-fit estimate pending structured review.",
  };
}

function defaultExecutionReadiness(market: NonNullable<ReturnType<typeof getMarket>>) {
  return {
    score: market.completeness,
    customerAccess: market.quality.customerValidation,
    prototypeReadiness: market.completeness,
    regulatoryReadiness: 70,
    dataAvailability: market.quality.evidenceCoverage,
    integrationComplexity: 60,
    onboardingComplexity: 60,
    timeToMvp: market.completeness,
    costToValidate: market.completeness,
    explanation: "Manual execution-readiness estimate pending structured review.",
  };
}

function defaultLeadership(market: NonNullable<ReturnType<typeof getMarket>>) {
  return {
    chance: market.chance,
    competitiveIntensity: 60,
    marketFragmentation: market.framework.fragmentation,
    incumbentStrength: 55,
    localizationAdvantage: market.framework.messenger_dependence,
    distributionDifficulty: 60,
    switchingBarriers: market.framework.stickiness,
    speedAdvantage: market.completeness,
    explanation: "Manual chance-of-becoming-number-one estimate pending structured review.",
  };
}
