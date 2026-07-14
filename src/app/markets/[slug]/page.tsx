import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, GitCompareArrows, Network, NotebookText, SlidersHorizontal, Sparkles } from "lucide-react";
import { AiPanel } from "@/components/app/ai-panel";
import { AdvancedDisclosure, DecisionCard, RecommendationCard, ResearchActionCard, UnknownCard } from "@/components/app/decision-cards";
import { ExplainableMetric } from "@/components/app/explainable-metric";
import { MdxChapter } from "@/components/app/mdx-chapter";
import { PageHeader } from "@/components/app/page-header";
import { FrameworkBars, FrameworkRadar, HistoricalScoreChart } from "@/components/charts/research-charts";
import { calculateDecisionScore, decisionScoreExplanation } from "@/lib/decision/calculations";
import { calculateWeightedMarketScore, scoringWeightSnapshot } from "@/config/scoring";
import {
  frameworkWeights,
  getMarket,
  markets,
  type BuildRoadmapStage,
  type CommercialMetricGroup,
  type Market,
  type ProductAction,
  type ProductActionPhase,
  type ProductField,
  type ProductStage,
  type ProductStrategy,
  type ValidationGate,
  type ValidationGateStatus,
} from "@/data/research";
import { getDb } from "@/lib/db";
import { productStrategyFromSnapshot } from "@/lib/research/product-strategy";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return markets.map((market) => ({ slug: market.slug }));
}

type ImportedResearchAction = {
  id: string;
  title: string;
  description: string;
  priority: string;
  reason: string;
  status: string;
  expectedConfidenceImprovement: number;
  estimatedImpact: number;
};

const productStageLabels: Record<ProductStage, string> = {
  market_research: "Market Research",
  product_thesis: "Product Thesis",
  mvp_scope: "MVP Scope",
  demo_build: "Demo Build",
  pitching: "Pitching",
  pilot: "Pilot",
  product_validation: "Product Validation",
  scale: "Scale",
};

const actionPhaseRank: ProductActionPhase[] = [
  "market_uncertainty",
  "icp",
  "core_problem",
  "product_wedge",
  "mvp_scope",
  "demo_build",
  "sales_pitch",
  "commercial_outreach",
  "pilot",
  "product_usage",
  "v2",
  "expansion_economics",
  "supplier_marketplace_economics",
  "scale",
];

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = getMarket(slug);
  if (!market) notFound();

  const dbMarket = await getDb().market.findUnique({
    where: { slug },
    include: {
      scores: { include: { scoreCategory: true } },
      decisionMetric: true,
      founderFitMetric: true,
      executionReadinessMetric: true,
      leadershipMetric: true,
      researchCoverage: { orderBy: [{ score: "asc" }, { category: "asc" }] },
      criticalUnknowns: { orderBy: [{ importance: "desc" }, { currentConfidence: "asc" }] },
      killCriteria: { orderBy: [{ status: "desc" }, { severity: "desc" }] },
      strategicAdvantages: { orderBy: { confidence: "desc" } },
      strategicDisadvantages: { orderBy: { confidence: "desc" } },
      researchActions: { orderBy: [{ priority: "desc" }, { estimatedImpact: "desc" }] },
      decisionLogs: { orderBy: { approvedAt: "desc" } },
      scoreHistory: { include: { scoreCategory: true }, orderBy: { approvedAt: "desc" } },
      competitors: { orderBy: { company: "asc" } },
      timelineEvents: { orderBy: { createdAt: "desc" } },
      reportUpdates: { orderBy: { createdAt: "desc" } },
      productStrategySnapshot: true,
      imports: { orderBy: { importedAt: "desc" }, take: 1 },
      claims: { include: { scoreCategory: true, sources: { include: { source: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  const scoreRows = dbMarket?.scores ?? [];
  const persistedFramework = { ...market.framework };
  for (const score of scoreRows) {
    persistedFramework[score.scoreCategory.key as keyof typeof persistedFramework] = score.score;
  }
  const activeMarket = { ...market, framework: persistedFramework };
  const totalMarketScore = scoreRows.length
    ? calculateWeightedMarketScore(scoreRows.map((score) => ({ key: score.scoreCategory.key, score: score.score })))
    : calculateWeightedMarketScore(frameworkWeights.map((item) => ({ key: item.key, score: activeMarket.framework[item.key] })));

  const fallbackDecisionInput = {
    totalMarketScore,
    researchConfidence: market.confidence,
    researchCompleteness: market.completeness,
    customerValidation: market.quality.customerValidation,
    competitorCoverage: market.quality.competitorCoverage,
    executionReadiness: dbMarket?.executionReadinessMetric?.score ?? market.completeness,
    founderFit: dbMarket?.founderFitMetric?.score ?? market.confidence,
    criticalUnknownPenalty: 0,
    killCriteriaPenalty: 0,
  };
  const decisionMetric = dbMarket?.decisionMetric;
  const decisionScore = decisionMetric?.decisionScore ?? calculateDecisionScore(fallbackDecisionInput);
  const decisionFormulaText = decisionMetric?.explanation ?? decisionScoreExplanation(fallbackDecisionInput);
  const productStrategy = dbMarket?.productStrategySnapshot
    ? productStrategyFromSnapshot(dbMarket.productStrategySnapshot)
    : market.productStrategy;
  const productAction = productStrategy ? selectCurrentProductAction(productStrategy) : neutralProductAction(market.name);
  const upcomingProductActions = productStrategy ? productStrategy.productActions
    .filter((action) => action.id !== productAction.id && !["completed", "rejected"].includes(action.status))
    .sort((a, b) => actionPhaseRank.indexOf(a.phase) - actionPhaseRank.indexOf(b.phase))
    .slice(0, 4) : [];
  const currentGate = productStrategy ? productStrategy.validationGates.find((gate) => gate.status === "current") ?? productStrategy.validationGates.find((gate) => gate.status !== "completed") : undefined;
  const completedGates = productStrategy ? productStrategy.validationGates.filter((gate) => gate.status === "completed") : [];
  const blockedGates = productStrategy ? productStrategy.validationGates.filter((gate) => gate.status === "blocked") : [];
  const recommendation = productStrategy ? topRecommendation(productStrategy, market.recommendation) : "Continue Research";
  const primaryBlocker = productAction.blockedBy[0] ?? (productStrategy ? productStrategy.primaryBlocker : `${market.name} ICP and product wedge have not been approved.`);

  const coverage = dbMarket?.researchCoverage ?? [];
  const activeCoverage = coverage.filter((item) => !isArchivedCoverageCategory(item.category, item.label, item.freshnessStatus));
  const archivedCoverage = coverage.filter((item) => isArchivedCoverageCategory(item.category, item.label, item.freshnessStatus));
  const weakestCoverage = activeCoverage.slice(0, 5);
  const highConfidenceCoverage = [...activeCoverage].sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  const staleCoverage = activeCoverage.filter((item) => ["aging", "stale", "unknown"].includes(item.freshnessStatus));
  const approvedClaims = dbMarket?.claims.filter((claim) => ["verified", "incorporated"].includes(claim.status)) ?? [];
  const pendingReportUpdates = (dbMarket?.reportUpdates ?? []).filter((update) => update.status !== "rejected");
  const archivedUnknowns = (dbMarket?.criticalUnknowns ?? []).filter((unknown) => isArchivedBusinessModelAssumption(unknown.title, unknown.status));
  const openUnknowns = (dbMarket?.criticalUnknowns ?? []).filter((unknown) => !["validated", "disproven"].includes(unknown.status) && !isArchivedBusinessModelAssumption(unknown.title, unknown.status));
  const criticalUnknownCount = openUnknowns.filter((unknown) => unknown.importance === "critical").length;
  const confidenceGap = openUnknowns.length
    ? Math.round(openUnknowns.reduce((sum, unknown) => sum + Math.max(0, unknown.targetConfidence - unknown.currentConfidence), 0) / openUnknowns.length)
    : 0;
  const archivedKillCriteria = (dbMarket?.killCriteria ?? []).filter((criterion) => isArchivedBusinessModelAssumption(criterion.title, criterion.status));
  const activeKillCriteria = (dbMarket?.killCriteria ?? []).filter((criterion) => !isArchivedBusinessModelAssumption(criterion.title, criterion.status));
  const triggeredKills = activeKillCriteria.filter((criterion) => criterion.status === "triggered");
  const warningKills = activeKillCriteria.filter((criterion) => criterion.status === "warning");
  const killStatus = triggeredKills.length ? "Triggered" : warningKills.length ? "Warning" : "Monitoring";
  const supplierMarginAction = (dbMarket?.researchActions ?? []).find((action) => {
    const text = `${action.title} ${action.description} ${action.reason}`.toLowerCase();
    return text.includes("supplier") || text.includes("oil") || text.includes("parts");
  });
  const decoratedResearchActions = (dbMarket?.researchActions ?? []).slice(0, 8).map((action) => decorateResearchAction(action));
  const timeline = dbMarket?.timelineEvents.length
    ? dbMarket.timelineEvents.map((event) => ({ id: event.id, date: event.createdAt.toLocaleDateString(), type: event.type, title: event.title }))
    : market.timeline.map((event, index) => ({ id: `static-${index}`, ...event }));
  const lastUpdated = latestDate([
    dbMarket?.updatedAt,
    dbMarket?.imports[0]?.importedAt,
    dbMarket?.imports[0]?.researchDate,
  ]);

  return (
    <div>
      <PageHeader
        title={market.name}
        subtitle={slug === "workshop" ? "Garage Management Software (GMS)" : undefined}
        description={market.summary}
        actions={
          <>
            <Button variant="outline" size="sm"><FileDown data-icon="inline-start" />Export PDF</Button>
            <Button variant="outline" size="sm"><GitCompareArrows data-icon="inline-start" />Compare</Button>
            <Button variant="outline" size="sm"><Sparkles data-icon="inline-start" />Generate Summary</Button>
            <Button variant="outline" size="sm"><NotebookText data-icon="inline-start" />Open Notes</Button>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/markets/${slug}/metrics`}><SlidersHorizontal data-icon="inline-start" />Strategic Metrics</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/markets/${slug}/intelligence`}><Network data-icon="inline-start" />Intelligence Graph</Link>
          </>
        }
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_340px] lg:p-6">
        <div className="grid gap-4">
          <Section title="Investment Summary">
            <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
              <RecommendationCard
                recommendation={recommendation}
                score={decisionScore}
                confidence={decisionMetric?.confidence ?? market.confidence}
                nextAction={productAction.title}
                href="/investment-committee"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <DecisionCard label="Market Score" value={totalMarketScore} tone={totalMarketScore >= 75 ? "good" : totalMarketScore >= 60 ? "watch" : "risk"} />
                <DecisionCard label="Decision Score" value={decisionScore} tone={decisionScore >= 80 ? "good" : decisionScore >= 65 ? "watch" : "risk"} />
                <DecisionCard label="Research Confidence" value={`${decisionMetric?.confidence ?? market.confidence}%`} tone={(decisionMetric?.confidence ?? market.confidence) >= 70 ? "good" : "watch"} />
                <DecisionCard label="Product Stage" value={productStrategy ? productStageLabels[productStrategy.currentProductStage] : "Product Thesis"} tone={productStrategy && productStrategy.productReadiness >= 70 ? "good" : "watch"} />
                <ResearchActionCard title="Current Next Action" action={productAction.title} priority={productAction.phase.replaceAll("_", " ")} />
                <UnknownCard title={primaryBlocker} detail={currentGate?.label} severity={primaryBlocker ? "watch" : "good"} />
              </div>
            </div>
          </Section>

          <WhatWeAreBuildingCard marketName={market.name} strategy={productStrategy} />

          <Section title="Current Decision">
            <div className="grid gap-3 md:grid-cols-4">
              <ScoreTile label="Recommendation" value={recommendation} tone={recommendationTone(recommendation)} />
              <ScoreTile label="Should Continue" value={recommendation === "Pause" || recommendation === "Reject" ? "No" : "Yes"} tone={recommendation === "Pause" || recommendation === "Reject" ? "risk" : "good"} />
              <ScoreTile label="What We Build" value={productStrategy?.productName.value ?? "Not defined"} tone="watch" />
              <ScoreTile label="Blocking Progress" value={primaryBlocker} tone={primaryBlocker ? "watch" : "good"} />
            </div>
            <MarketProjectMetricsSection market={activeMarket} productStrategy={productStrategy} />
          </Section>

          {productStrategy ? <ProductStrategySection strategy={productStrategy} /> : <ProductStrategyEmptyState marketName={market.name} />}
          {productStrategy ? <BuildRoadmapSection roadmap={productStrategy.buildRoadmap} /> : null}
          <CommercialMetricsSection groups={productStrategy?.commercialMetricGroups ?? []} />
          {productStrategy ? <ValidationGateSection currentGate={currentGate} completedGates={completedGates} blockedGates={blockedGates} gates={productStrategy.validationGates} /> : null}
          <CurrentActionSection action={productAction} upcomingActions={upcomingProductActions} importedActions={decoratedResearchActions} />

          <Section title="Top Reasons to Pursue">
            <DataGrid items={(dbMarket?.strategicAdvantages ?? []).slice(0, 3)} render={(item) => (
              <InfoCard key={item.id} title={item.title} badges={[item.capabilityType, item.defensibility, `${item.confidence}%`]} body={item.description} footer={`${item.evidenceStatus} - ${item.timeHorizon}`} />
            )} empty={market.strengths.join("\n")} />
          </Section>

          <Section title="Top Reasons to Reject">
            <DataGrid items={(dbMarket?.strategicDisadvantages ?? []).slice(0, 3)} render={(item) => (
              <InfoCard key={item.id} title={item.title} badges={[item.capabilityType, item.defensibility, `${item.confidence}%`]} body={item.description} footer={`${item.evidenceStatus} - ${item.timeHorizon}`} />
            )} empty={market.weaknesses.join("\n")} />
          </Section>

          <Section title="Critical Unknowns">
            <div className="grid gap-3 md:grid-cols-4">
              <ScoreTile label="Open" value={openUnknowns.length} tone="watch" />
              <ScoreTile label="Critical" value={criticalUnknownCount} tone={criticalUnknownCount ? "risk" : "good"} />
              <ScoreTile label="Confidence Gap" value={`${confidenceGap}%`} tone={confidenceGap > 30 ? "risk" : "watch"} />
              <ScoreTile label="Decision Impact" value={`-${decisionMetric?.criticalUnknownPenalty ?? 0}`} tone={(decisionMetric?.criticalUnknownPenalty ?? 0) > 5 ? "risk" : "watch"} />
            </div>
            <DataGrid items={openUnknowns} render={(item) => (
              <InfoCard key={item.id} title={item.title} badges={[item.importance, item.status, item.category]} body={item.description} footer={item.recommendedAction ?? item.validationMethod} />
            )} empty="No critical unknowns." />
          </Section>

          <Section title="Competitor Landscape">
            <Card><CardContent className="pt-6"><MdxChapter body={market.chapters.Competitors} /></CardContent></Card>
            <DataGrid items={dbMarket?.competitors ?? []} render={(item) => (
              <InfoCard key={item.id} title={item.company} badges={[item.country ?? "unknown country", item.threatLevel ?? "unrated"]} body={item.targetSegment ?? item.website ?? "No competitor notes yet."} footer={item.website ?? undefined} />
            )} empty="No imported competitor records yet." />
          </Section>

          <Section title="Market Evidence">
            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <Card>
                <CardHeader><CardTitle className="text-sm">Market Thesis Metrics</CardTitle></CardHeader>
                <CardContent><FrameworkBars market={activeMarket} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Research Coverage</CardTitle></CardHeader>
                <CardContent className="grid gap-3">
                  {activeCoverage.slice(0, 6).map((item) => (
                    <div key={item.id} className="grid gap-2">
                      <div className="flex items-center justify-between gap-2 text-sm"><span>{item.label}</span><span className="font-mono">{item.score}%</span></div>
                      <Progress value={item.score} />
                      <div className="text-xs text-muted-foreground">{item.verifiedEvidenceCount}/{item.evidenceCount} verified evidence - {item.recommendedNextAction}</div>
                    </div>
                  ))}
                  {!activeCoverage.length ? <p className="text-sm text-muted-foreground">No active structured coverage imported yet.</p> : null}
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section title="Risks">
            {(triggeredKills.length > 0 || warningKills.length > 0) ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Kill criteria status: {killStatus}. Manual recommendation approval is required before pausing or rejecting.</div>
            ) : null}
            <Card><CardContent className="pt-6"><MdxChapter body={market.chapters.Risks} /></CardContent></Card>
            <DataGrid items={activeKillCriteria} render={(item) => (
              <InfoCard key={item.id} title={item.title} badges={[item.severity, item.status, item.evidenceStatus]} body={`${item.description} Threshold: ${item.threshold}`} footer={item.reviewerNote ?? "Monitoring"} />
            )} empty="No kill criteria." />
            {(archivedUnknowns.length || archivedKillCriteria.length) ? (
              <details className="rounded-md border bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium">Archived subscription-first assumptions</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {archivedUnknowns.map((item) => (
                    <InfoCard key={item.id} title={item.title} badges={[item.importance, item.status, item.category]} body={item.description} footer="Archived - superseded business-model assumption" />
                  ))}
                  {archivedKillCriteria.map((item) => (
                    <InfoCard key={item.id} title={item.title} badges={[item.severity, item.status, item.evidenceStatus]} body={`${item.description} Threshold: ${item.threshold}`} footer={item.reviewerNote ?? "Archived - superseded business-model assumption"} />
                  ))}
                </div>
              </details>
            ) : null}
          </Section>

          <Section title="Decision Log">
            <DataGrid items={dbMarket?.decisionLogs ?? []} render={(item) => (
              <InfoCard key={item.id} title={item.title} badges={[item.decisionType, item.reversible ? "reversible" : "one-way"]} body={item.rationale} footer={`${item.decision} - approved by ${item.approvedBy} on ${item.approvedAt.toISOString().slice(0, 10)}`} />
            )} empty="No decision log entries." />
          </Section>

          <Section title="Report Chapters">
            <Tabs defaultValue="Overview">
              <TabsList variant="line" className="h-auto w-full flex-wrap justify-start rounded-none border-b p-0">
                {Object.keys(market.chapters).map((chapter) => <TabsTrigger key={chapter} value={chapter} className="h-8 flex-none text-xs">{chapter}</TabsTrigger>)}
              </TabsList>
              {Object.entries(market.chapters).map(([chapter, body]) => (
                <TabsContent key={chapter} value={chapter}>
                  <Card><CardContent className="pt-6"><MdxChapter body={body} /></CardContent></Card>
                </TabsContent>
              ))}
            </Tabs>
            <DataGrid items={pendingReportUpdates} render={(item) => (
              <InfoCard key={item.id} title={item.title} badges={[item.chapter, item.status]} body={item.content} />
            )} empty="No pending or accepted imported report updates." />
          </Section>

          <Section title="Sources">
            <DataGrid items={approvedClaims} render={(claim) => (
              <InfoCard key={claim.id} title={claim.statement} badges={[claim.scoreCategory?.label ?? "Uncategorized", `${Math.round(claim.confidence * 100)}% confidence`]} body={`${claim.sources.length} linked source(s)`} footer={claim.sources.map((source) => source.source.title).join(", ") || "No source titles."} />
            )} empty="No approved imported claims yet." />
          </Section>

          <AdvancedDisclosure title="Advanced Analysis">
            <div className="grid gap-4">
              <SupportingKpisSection
                slug={slug}
                market={market}
                totalMarketScore={totalMarketScore}
                decisionScore={decisionScore}
                decisionFormulaText={decisionFormulaText}
                decisionMetric={decisionMetric}
                approvedClaims={approvedClaims}
                openUnknowns={openUnknowns}
                staleCoverage={staleCoverage}
                weakestCoverage={weakestCoverage}
                triggeredKills={triggeredKills}
              />
              <Section title="Score Diagnostics">
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card><CardHeader><CardTitle className="text-sm">Framework radar</CardTitle></CardHeader><CardContent><FrameworkRadar market={activeMarket} /></CardContent></Card>
                  <Card><CardHeader><CardTitle className="text-sm">Historical score</CardTitle></CardHeader><CardContent><HistoricalScoreChart market={market} /></CardContent></Card>
                </div>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Weighted scoring framework</CardTitle></CardHeader>
                  <CardContent className="grid gap-4 xl:grid-cols-[1fr_340px]">
                    <FrameworkBars market={activeMarket} />
                    <div className="flex flex-col gap-2">
                      {frameworkWeights.map((item) => (
                        <ExplainableMetric key={item.key} label={item.label} value={activeMarket.framework[item.key]} formula={`${activeMarket.framework[item.key]} x ${item.weight}%`} explanation={`${item.label} contributes ${item.weight}% to Total Market Score in framework 2.0.`} history={dbMarket?.scoreHistory.filter((history) => history.scoreCategory.key === item.key).map((history) => ({ label: history.approvedAt.toISOString().slice(0, 10), value: history.newScore })) ?? []} intelligenceHref={`/markets/${slug}/intelligence?focus=score_category:${item.key}&layout=score`} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Section>
              <Section title="Decision Score">
                <div className="grid gap-3 md:grid-cols-3">
                  <ScoreTile label="Decision Score" value={decisionScore} tone={decisionScore >= 80 ? "good" : decisionScore >= 65 ? "watch" : "risk"} />
                  <ScoreTile label="Critical Unknowns Penalty" value={`-${decisionMetric?.criticalUnknownPenalty ?? 0}`} tone={(decisionMetric?.criticalUnknownPenalty ?? 0) > 5 ? "risk" : "watch"} />
                  <ScoreTile label="Kill Criteria Penalty" value={`-${decisionMetric?.killCriteriaPenalty ?? 0}`} tone={(decisionMetric?.killCriteriaPenalty ?? 0) > 0 ? "risk" : "good"} />
                </div>
                <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 text-xs text-muted-foreground">{decisionFormulaText}</pre>
              </Section>
              <Section title="Detailed Coverage Analytics">
                <div className="grid gap-3 md:grid-cols-3">
                  <ReasonList title="Research Coverage Gaps" items={weakestCoverage.map((item) => `${item.label}: ${item.score}%`)} fallback={[]} />
                  <ReasonList title="Highest Confidence Categories" items={highConfidenceCoverage.map((item) => `${item.label}: ${item.confidence}%`)} fallback={[]} />
                  <ReasonList title="Stale Coverage Warnings" items={staleCoverage.map((item) => `${item.label}: ${item.freshnessStatus}`)} fallback={["No stale coverage warnings."]} />
                </div>
                {archivedCoverage.length ? (
                  <details className="rounded-md border bg-card p-4">
                    <summary className="cursor-pointer text-sm font-medium">Archived coverage categories</summary>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      {archivedCoverage.map((item) => <div key={item.id}>{item.label}: {item.recommendedNextAction}</div>)}
                    </div>
                  </details>
                ) : null}
              </Section>
              {market.revenueMachine ? <IllustrativeSupplierScenarioSection machine={market.revenueMachine} linkedAction={supplierMarginAction ? decorateResearchAction(supplierMarginAction) : undefined} /> : null}
              <Section title="Historical Framework Diagnostics">
                <DataGrid items={dbMarket?.scoreHistory ?? []} render={(item) => (
                  <InfoCard key={item.id} title={item.scoreCategory.label} badges={[`v${item.frameworkVersion}`, `${item.previousScore} -> ${item.newScore}`]} body={item.reason} footer={`Historical total retained: ${item.totalScoreBefore} -> ${item.totalScoreAfter}`} />
                )} empty="No approved score changes yet." />
                <DataGrid items={timeline} render={(item) => (
                  <InfoCard key={item.id} title={item.title} badges={[item.type]} body={item.date} />
                )} empty="No timeline events." />
              </Section>
              <Section title="Intelligence Graph">
                <div className="grid gap-3 md:grid-cols-3">
                  <GraphPreview title="Top Evidence Network" description={`${approvedClaims.length} approved claim(s), ${approvedClaims.flatMap((claim) => claim.sources).length} linked source edge(s).`} href={`/markets/${slug}/intelligence?layout=evidence`} />
                  <GraphPreview title="Competitor Impact Network" description={`${dbMarket?.competitors.length ?? 0} competitor(s), ${decisionMetric?.competitorCoverage ?? market.quality.competitorCoverage}% coverage.`} href={`/markets/${slug}/intelligence?layout=competitor`} />
                  <GraphPreview title="Critical Unknown Network" description={`${openUnknowns.length} open unknown(s), ${criticalUnknownCount} critical blocker(s).`} href={`/markets/${slug}/intelligence?layout=decision`} />
                </div>
              </Section>
            </div>
          </AdvancedDisclosure>
        </div>
        <div className="grid content-start gap-4">
          <AiPanel />
          <Card>
            <CardHeader><CardTitle className="text-sm">Market Status</CardTitle></CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Recommendation" value={recommendation} />
              <Row label="Research Stage" value={market.stage} />
              <Row label="Product Stage" value={productStrategy ? productStageLabels[productStrategy.currentProductStage] : "Product Thesis"} />
              <Row label="Current Gate" value={currentGate?.label ?? "No gate set"} />
              <Row label="Kill Criteria" value={killStatus} />
              <Row label="Last Updated" value={lastUpdated ? lastUpdated.toLocaleDateString("sv-SE") : market.updatedAt} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Current MVP</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {productStrategy ? (
                <>
                  <p className="text-muted-foreground">{productStrategy.mvpObjective.value}</p>
                  <List items={productStrategy.mvpFeatures.value.slice(0, 5)} />
                </>
              ) : (
                <p className="text-muted-foreground">Product strategy not yet defined.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">What Would Make Us Stop?</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {activeKillCriteria.slice(0, 4).map((item) => <div key={item.id} className="rounded-md border bg-background p-3 text-sm">{item.title}</div>)}
              {!activeKillCriteria.length ? <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">No active kill criteria imported yet.</div> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function WhatWeAreBuildingCard({ marketName, strategy }: { marketName: string; strategy?: ProductStrategy }) {
  if (!strategy) {
    return (
      <Section title="What We Are Building">
        <Card>
          <CardContent className="grid gap-4 pt-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryBlock label="Product" value="Not defined" />
              <SummaryBlock label="Target Customer" value="Not approved" />
              <SummaryBlock label="Core Problem" value="Not approved" />
              <SummaryBlock label="MVP" value="Not defined" />
              <SummaryBlock label="Business Model" value="Not approved" />
              <SummaryBlock label="Current Stage" value="Product Thesis" />
              <SummaryBlock label="Current Next Action" value={`Define ${marketName} Ideal Customer Profile.`} />
              <SummaryBlock label="Primary Blocker" value={`${marketName} ICP and product wedge have not been approved.`} />
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Status</div>
              <p className="mt-2 text-sm font-medium">Needs product research</p>
              <p className="mt-2 text-sm text-muted-foreground">Product strategy not yet defined.</p>
              <p className="mt-2 text-sm text-muted-foreground">Current task: Define the Ideal Customer Profile, core problem and product wedge for this market.</p>
            </div>
          </CardContent>
        </Card>
      </Section>
    );
  }

  return (
    <Section title="What We Are Building">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="grid gap-4 pt-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryBlock label="Product" value={strategy.productName.value} />
              <SummaryBlock label="Target Customer" value={strategy.idealCustomerProfile.value} />
              <SummaryBlock label="Current Stage" value={productStageLabels[strategy.currentProductStage]} />
              <SummaryBlock label="Primary Blocker" value={strategy.primaryBlocker} />
            </div>
            <SummaryBlock label="Core Problem" value={strategy.coreProblem.value} />
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">MVP</div>
              <div className="grid gap-2 md:grid-cols-2">
                {strategy.mvpFeatures.value.map((feature) => <div key={feature} className="rounded-md border bg-background px-3 py-2 text-sm">{feature}</div>)}
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Business Model</div>
              <List items={strategy.businessModel.value} />
            </div>
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Current Next Action</div>
              <p className="mt-2 text-sm font-medium">{selectCurrentProductAction(strategy).title}</p>
              <p className="mt-2 text-xs text-muted-foreground">This approves a pitchable free MVP, not the complete platform.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}

function ProductStrategyEmptyState({ marketName }: { marketName: string }) {
  return (
    <Section title="Product Strategy">
      <Card>
        <CardContent className="grid gap-2 pt-6 text-sm">
          <div className="font-medium">Product strategy not yet defined.</div>
          <div className="text-muted-foreground">Current task: Define the Ideal Customer Profile, core problem and product wedge for this market.</div>
          <div className="text-muted-foreground">Status: Needs product research</div>
          <div className="text-muted-foreground">Next action: Define {marketName} Ideal Customer Profile.</div>
        </CardContent>
      </Card>
    </Section>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function ProductStrategySection({ strategy }: { strategy: ProductStrategy }) {
  return (
    <Section title="Product Strategy">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm">What exact product should be built first?</CardTitle>
              <Badge>{productStageLabels[strategy.currentProductStage]}</Badge>
              <Badge variant="outline">{strategy.productDecisionStatus.replaceAll("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <TraceField label="Ideal Customer Profile" field={strategy.idealCustomerProfile} />
            <TraceField label="Primary User" field={strategy.primaryUser} />
            <TraceField label="Core Problem" field={strategy.coreProblem} />
            <TraceField label="Product Wedge" field={strategy.productWedge} />
            <TraceField label="MVP Objective" field={strategy.mvpObjective} />
            <details className="rounded-md border bg-background p-3">
              <summary className="cursor-pointer text-sm font-medium">View Details</summary>
              <div className="mt-3 grid gap-4">
                <TraceListField label="Core Workflow" field={strategy.coreWorkflow} ordered />
                <TraceListField label="MVP Features" field={strategy.mvpFeatures} />
                <TraceListField label="Not in MVP" field={strategy.notInMvp} />
                <TraceListField label="MVP Success Criteria" field={strategy.mvpSuccessCriteria} />
                <TraceListField label="V2 Features" field={strategy.v2Features} />
                <TraceListField label="V3 Features" field={strategy.v3Features} />
                <TraceField label="Long-Term Platform Thesis" field={strategy.longTermPlatformThesis} />
                <TraceListField label="Key Product Assumptions" field={strategy.keyProductAssumptions} />
                <TraceListField label="Product Risks" field={strategy.productRisks} />
              </div>
            </details>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Product Decision State</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Current Product Stage" value={productStageLabels[strategy.currentProductStage]} />
            <Row label="Current Validation Stage" value={strategy.currentValidationStage} />
            <Row label="Product Readiness" value={`${strategy.productReadiness}%`} />
            <Row label="Product Decision Status" value={strategy.productDecisionStatus.replaceAll("_", " ")} />
            <div className="rounded-md border bg-background p-3">
              <div className="font-medium">Primary Blocker</div>
              <p className="mt-1 text-muted-foreground">{strategy.primaryBlocker}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function CommercialMetricsSection({ groups }: { groups: CommercialMetricGroup[] }) {
  return (
    <Section title="Commercial Validation Metrics">
      {groups.length ? (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {groups.map((group) => (
              <Card key={group.title}>
                <CardHeader><CardTitle className="text-sm">{group.title}</CardTitle></CardHeader>
                <CardContent><List items={group.metrics} /></CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">These are project and commercial-validation metrics. They remain separate from Market Score.</p>
        </>
      ) : (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Commercial validation model not yet defined.</CardContent></Card>
      )}
    </Section>
  );
}

function BuildRoadmapSection({ roadmap }: { roadmap: BuildRoadmapStage[] }) {
  return (
    <Section title="Build Roadmap: MVP / V2 / V3 / Platform">
      <div className="grid gap-3 xl:grid-cols-4">
        {roadmap.map((stage) => (
          <Card key={stage.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{stage.label}</CardTitle>
                <Badge variant={stage.status === "approved" || stage.status === "building" ? "default" : "secondary"}>{stage.status}</Badge>
              </div>
              {stage.id === "v3" || stage.id === "platform" ? <Badge variant="outline">Future Hypothesis - not included in base case</Badge> : null}
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p className="text-muted-foreground">{stage.objective}</p>
              <Row label="Target user" value={stage.targetUser} />
              <Row label="Confidence" value={`${stage.confidence}%`} />
              <details className="rounded-md border bg-background p-3">
                <summary className="cursor-pointer font-medium">View Details</summary>
                <div className="mt-3 grid gap-3">
                  <MiniList title="Key Features" items={stage.keyFeatures} />
                  <MiniList title="Dependencies" items={stage.dependencies} />
                  <MiniList title="Validation Required" items={stage.validationRequired} />
                  <MiniList title="Success Criteria" items={stage.successCriteria} />
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function ValidationGateSection({
  currentGate,
  completedGates,
  blockedGates,
  gates,
}: {
  currentGate?: ValidationGate;
  completedGates: ValidationGate[];
  blockedGates: ValidationGate[];
  gates: ValidationGate[];
}) {
  return (
    <Section title="Current Validation Stage">
      <div className="grid gap-3 md:grid-cols-4">
        <ScoreTile label="Current Gate" value={currentGate?.label ?? "No gate"} tone="watch" />
        <ScoreTile label="Completed Gates" value={completedGates.length} tone={completedGates.length ? "good" : "watch"} />
        <ScoreTile label="Blocked Gates" value={blockedGates.length} tone={blockedGates.length ? "risk" : "good"} />
        <ScoreTile label="Next Gate" value={currentGate?.nextGate ?? "None"} tone="watch" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {gates.map((gate) => (
          <Card key={gate.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{gate.label}</CardTitle>
                <GateBadge status={gate.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {gate.requirements.map((requirement) => (
                <div key={requirement.label} className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
                  <span>{requirement.label}</span>
                  <GateBadge status={requirement.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function CurrentActionSection({
  action,
  upcomingActions,
  importedActions,
}: {
  action: ProductAction;
  upcomingActions: ProductAction[];
  importedActions: Array<ImportedResearchAction & { phase: ProductActionPhase; blockedBy: string[]; unlocks: string[]; completionCriteria: string[] }>;
}) {
  return (
    <Section title="Current Next Action">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm">{action.title}</CardTitle>
              <Badge>Current Next Action</Badge>
              <Badge variant="outline">{action.phase.replaceAll("_", " ")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Status" value={action.status} />
            <MiniList title="Why Now" items={[action.whyNow]} />
            <MiniList title="Why Not Later" items={[action.whyNotLater]} />
            <MiniList title="Blocked By" items={action.blockedBy.length ? action.blockedBy : ["No blocker recorded"]} />
            <MiniList title="Completion Criteria" items={action.completionCriteria} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Upcoming Actions</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm">
            {upcomingActions.map((item) => (
              <div key={item.id} className="rounded-md border bg-background p-3">
                <div className="font-medium">{item.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">After: {item.dependsOn.join(", ") || "No dependency"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <details className="rounded-md border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">View Imported Research Backlog</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {importedActions.map((item) => (
            <InfoCard key={item.id} title={item.title} badges={[item.priority, item.status, item.phase.replaceAll("_", " ")]} body={item.description} footer={`Blocked by: ${item.blockedBy.join(", ") || "not blocked"}; completion: ${item.completionCriteria.join(", ")}`} />
          ))}
          {!importedActions.length ? <p className="text-sm text-muted-foreground">No imported research actions yet.</p> : null}
        </div>
      </details>
    </Section>
  );
}

function IllustrativeSupplierScenarioSection({
  machine,
  linkedAction,
}: {
  machine: NonNullable<NonNullable<ReturnType<typeof getMarket>>["revenueMachine"]>;
  linkedAction?: ImportedResearchAction & { phase: ProductActionPhase; blockedBy: string[]; unlocks: string[]; completionCriteria: string[] };
}) {
  const unverified = machine.confidence < 60;
  return (
    <Section title="Illustrative Supplier Scenario">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-sm">{machine.title}</CardTitle>
              <Badge variant="destructive">Unverified hypothetical scenario</Badge>
              <Badge variant="destructive">Not included in forecasts or current valuation</Badge>
              {unverified ? <Badge variant="outline">Unverified Hypothesis</Badge> : null}
              <Badge variant="secondary">{machine.confidence}% confidence</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-muted-foreground">
            <p>{machine.thesis}</p>
            <p>{machine.operatingModel}</p>
            <div className="rounded-md border border-dashed bg-background p-3">
              <div className="mb-2 font-medium text-foreground">Illustrative scenario only</div>
              <div className="grid gap-2 text-xs md:grid-cols-2">
                <Row label="Aggregated demand" value={machine.example.demand} />
                <Row label="Supplier quote" value={machine.example.supplierPrice} />
                <Row label="Portal offer" value={machine.example.offerPrice} />
                <Row label="Current workshop price" value={machine.example.currentPrice} />
                <Row label="Gross spread" value={machine.example.portalMargin} />
                <Row label="Workshop saving" value={machine.example.customerSavings} />
              </div>
              <p className="mt-3 text-xs font-medium text-destructive">Unverified hypothetical scenario. Not included in forecasts or current valuation.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Expansion Validation</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            {linkedAction ? (
              <>
                <div className="font-medium text-foreground">{linkedAction.title}</div>
                <p>{linkedAction.description}</p>
                <MiniList title="Blocked By" items={linkedAction.blockedBy} />
                <Badge variant="outline">Gate 6 only</Badge>
              </>
            ) : (
              <p>Supplier economics belong in Gate 6 after product usage and real purchasing data exist.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <ReasonList title="Monetization Levers" items={machine.levers} fallback={[]} />
        <ReasonList title="Validation Questions" items={machine.validationQuestions} fallback={[]} />
        <ReasonList title="Risks" items={machine.risks} fallback={[]} />
      </div>
    </Section>
  );
}

function MarketProjectMetricsSection({ market, productStrategy }: { market: Market; productStrategy?: ProductStrategy }) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-sm">Market Metrics</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <MetricRow label="Market Score" value={market.score} />
          <MetricRow label="Competition" value={market.framework.competition} />
          <MetricRow label="Fragmentation" value={market.framework.fragmentation} />
          <MetricRow label="Stickiness" value={market.framework.stickiness} />
          <MetricRow label="Expansion" value={market.framework.expansion} />
          <MetricRow label="Data Moat" value={market.framework.data_moat} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Project Metrics</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {productStrategy ? (
            <>
              <MetricRow label="Product Readiness" value={productStrategy.productReadiness} />
              <MetricRow label="Pitch Readiness" value={productStrategy.pitchReadiness} />
              <MetricRow label="Commercial Validation" value={productStrategy.commercialValidation} />
              <MetricRow label="Product Validation" value={productStrategy.productValidation} />
              <MetricRow label="Expansion Validation" value={productStrategy.expansionValidation} />
            </>
          ) : (
            <p className="text-muted-foreground">Project metrics not yet defined.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SupportingKpisSection({
  slug,
  market,
  totalMarketScore,
  decisionScore,
  decisionFormulaText,
  decisionMetric,
  approvedClaims,
  openUnknowns,
  staleCoverage,
  weakestCoverage,
  triggeredKills,
}: {
  slug: string;
  market: Market;
  totalMarketScore: number;
  decisionScore: number;
  decisionFormulaText: string;
  decisionMetric?: {
    confidence: number;
    researchCompleteness: number;
    chanceOfBecomingNumberOne: number;
    customerValidation: number;
    competitorCoverage: number;
    founderFit: number;
    executionReadiness: number;
  } | null;
  approvedClaims: Array<{ externalId: string | null; sources: Array<{ source: { externalId: string | null } }> }>;
  openUnknowns: Array<{ title: string }>;
  staleCoverage: Array<{ label: string; freshnessStatus: string }>;
  weakestCoverage: Array<{ label: string; score: number; gaps: string }>;
  triggeredKills: Array<{ title: string }>;
}) {
  return (
    <Section title="Supporting KPIs">
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
        <ExplainableMetric label="Total Market Score" value={totalMarketScore} formula={scoreFormula()} explanation="Weighted score across the current 2.0 market scoring framework. Product progress and unverified future revenue scenarios do not inflate this score." confidence={market.confidence} history={market.history.map((item) => ({ label: item.month, value: item.score }))} gaps={weakestCoverage.map((item) => `${item.label}: ${item.score}%`)} intelligenceHref={`/markets/${slug}/intelligence?layout=score`} />
        <ExplainableMetric label="Decision Score" value={decisionScore} formula={decisionFormulaText} explanation="Decision Score answers how strongly this market should be pursued now. It combines market score, confidence, completeness, strategic metrics, and penalties." confidence={decisionMetric?.confidence ?? market.confidence} gaps={openUnknowns.map((item) => item.title)} intelligenceHref={`/markets/${slug}/intelligence?mode=decision`} />
        <ExplainableMetric label="Confidence" value={`${decisionMetric?.confidence ?? market.confidence}%`} formula="Average research confidence, adjusted by coverage quality." explanation="Confidence reflects how much of the current thesis is supported by reviewed evidence." linkedClaims={approvedClaims.map((claim) => claim.externalId ?? "").filter(Boolean).slice(0, 3)} gaps={staleCoverage.map((item) => `${item.label} freshness: ${item.freshnessStatus}`)} intelligenceHref={`/markets/${slug}/intelligence?mode=source-impact`} />
        <ExplainableMetric label="Research Completeness" value={`${decisionMetric?.researchCompleteness ?? market.completeness}%`} formula="Average of structured coverage categories." explanation="Completeness is separate from market attractiveness and describes how fully the investment question has been researched." gaps={weakestCoverage.map((item) => item.gaps)} intelligenceHref={`/markets/${slug}/intelligence?layout=evidence`} />
        <ExplainableMetric label="Recommendation" value={market.recommendation} explanation="Recommendation is a manually controlled market stance. Decision Score does not automatically change it." gaps={triggeredKills.map((item) => item.title)} intelligenceHref={`/markets/${slug}/intelligence?mode=decision`} />
        <ExplainableMetric label="Chance of Becoming #1" value={`${decisionMetric?.chanceOfBecomingNumberOne ?? market.chance}%`} explanation="Strategic leadership estimate based on competition, fragmentation, localization advantage, distribution difficulty, switching barriers, and speed." intelligenceHref={`/markets/${slug}/intelligence?layout=decision`} />
        <ExplainableMetric label="Customer Validation" value={`${decisionMetric?.customerValidation ?? market.quality.customerValidation}%`} explanation="Customer validation tracks interview and direct customer proof, not generic desk research." intelligenceHref={`/markets/${slug}/intelligence?layout=evidence`} />
        <ExplainableMetric label="Competitor Coverage" value={`${decisionMetric?.competitorCoverage ?? market.quality.competitorCoverage}%`} explanation="Competitor coverage measures how well direct and substitute competitors have been mapped." linkedSources={approvedClaims.flatMap((claim) => claim.sources.map((source) => source.source.externalId ?? "")).filter(Boolean).slice(0, 5)} intelligenceHref={`/markets/${slug}/intelligence?layout=competitor`} />
        <ExplainableMetric label="Founder Fit" value={`${decisionMetric?.founderFit ?? market.confidence}%`} explanation="Founder Fit is a manually editable strategic metric used in Decision Score, separate from Total Market Score." intelligenceHref={`/markets/${slug}/intelligence?mode=decision`} />
        <ExplainableMetric label="Execution Readiness" value={`${decisionMetric?.executionReadiness ?? market.completeness}%`} explanation="Execution Readiness estimates how quickly and cheaply the market can be validated and served." intelligenceHref={`/markets/${slug}/intelligence?mode=decision`} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Sensitivity Analysis</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Market Score remains separate from Product Readiness, Pitch Readiness, Commercial Validation, Product Validation, and Expansion Validation.</CardContent>
      </Card>
    </Section>
  );
}

function TraceField({ label, field }: { label: string; field: ProductField }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium">{label}</div>
        <Badge variant="secondary">{field.status.replaceAll("_", " ")}</Badge>
        <Badge variant="outline">{field.confidence}% confidence</Badge>
      </div>
      <p className="mt-2 text-muted-foreground">{field.value}</p>
      <TraceMeta field={field} />
    </div>
  );
}

function TraceListField({ label, field, ordered = false }: { label: string; field: ProductField<string[]>; ordered?: boolean }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium">{label}</div>
        <Badge variant="secondary">{field.status.replaceAll("_", " ")}</Badge>
        <Badge variant="outline">{field.confidence}% confidence</Badge>
      </div>
      <List items={field.value} ordered={ordered} />
      <TraceMeta field={field} />
    </div>
  );
}

function TraceMeta({ field }: { field: ProductField<unknown> }) {
  return (
    <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
      <div>Linked claims: {field.linkedClaims?.join(", ") || "none"}</div>
      <div>Linked sources: {field.linkedSources?.join(", ") || "none"}</div>
      <div>Linked assumptions: {field.linkedAssumptions?.join(", ") || "none"}</div>
      <div>Reviewer note: {field.reviewerNote ?? "none"}</div>
      <div>Last updated: {field.lastUpdated}</div>
    </div>
  );
}

function ReasonList({ title, items, fallback }: { title: string; items: string[]; fallback: string[] }) {
  const values = items.length ? items : fallback;
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        {values.map((item) => <div key={item}>{item}</div>)}
      </CardContent>
    </Card>
  );
}

function ScoreTile({ label, value, tone }: { label: string; value: string | number; tone: "good" | "watch" | "risk" }) {
  const toneClass = tone === "good" ? "border-primary/30 bg-primary/10" : tone === "watch" ? "border-muted bg-muted/40" : "border-destructive/40 bg-destructive/10";
  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-balance font-mono text-lg font-semibold md:text-xl">{value}</div>
    </div>
  );
}

function DataGrid<T>({ items, render, empty }: { items: T[]; render: (item: T) => React.ReactNode; empty: string }) {
  if (items.length === 0) return <Card><CardContent className="whitespace-pre-line pt-6 text-sm text-muted-foreground">{empty}</CardContent></Card>;
  return <div className="grid gap-3 md:grid-cols-2">{items.map(render)}</div>;
}

function InfoCard({ title, badges, body, footer }: { title: string; badges: string[]; body: string; footer?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          {title}
          {badges.filter(Boolean).map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        <p>{body}</p>
        {footer ? <p className="mt-2 text-xs">{footer}</p> : null}
      </CardContent>
    </Card>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{title}</div>
      <List items={items} />
    </div>
  );
}

function List({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`mt-2 grid gap-1 text-sm text-muted-foreground ${ordered ? "list-decimal pl-5" : "list-disc pl-5"}`}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </Tag>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  const tone = value >= 70 ? "bg-primary" : value >= 45 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="font-mono">{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function GateBadge({ status }: { status: ValidationGateStatus }) {
  const variant = status === "completed" ? "default" : status === "current" ? "secondary" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function GraphPreview({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} className="rounded-md border bg-card p-4 transition-colors hover:bg-accent">
      <div className="flex items-center gap-2 font-medium"><Network className="size-4" />{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-3 text-sm text-primary">Open full graph</div>
    </Link>
  );
}

function latestDate(values: Array<Date | undefined>) {
  const dates = values.filter((value): value is Date => value instanceof Date);
  if (!dates.length) return undefined;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function scoreFormula() {
  return scoringWeightSnapshot().map((item) => `${item.label}: score x ${item.weight}%`).join("\n");
}

function selectCurrentProductAction(strategy: ProductStrategy) {
  const explicit = strategy.productActions.find((action) => action.isCurrentAction && !["completed", "rejected"].includes(action.status));
  if (explicit) return explicit;
  return [...strategy.productActions]
    .filter((action) => !["completed", "rejected"].includes(action.status))
    .sort((a, b) => actionPhaseRank.indexOf(a.phase) - actionPhaseRank.indexOf(b.phase))[0] ?? strategy.productActions[0];
}

function neutralProductAction(marketName: string): ProductAction {
  return {
    id: "define-market-icp",
    title: `Define ${marketName} Ideal Customer Profile.`,
    phase: "icp",
    status: "planned",
    dependsOn: [],
    blockedBy: [`${marketName} ICP and product wedge have not been approved.`],
    unlocks: ["Product strategy"],
    isCurrentAction: true,
    whyNow: "A market-specific product strategy is required before roadmap, MVP, or commercial validation can be shown.",
    whyNotLater: "Using another market's strategy would contaminate the investment decision.",
    completionCriteria: ["ICP approved", "Core problem approved", "Product wedge approved"],
  };
}

function decorateResearchAction(action: ImportedResearchAction) {
  const text = `${action.title} ${action.description} ${action.reason}`.toLowerCase();
  const isSupplier = text.includes("supplier") || text.includes("oil") || text.includes("parts") || text.includes("marketplace");
  const isPilot = text.includes("pilot");
  const phase: ProductActionPhase = isSupplier ? "supplier_marketplace_economics" : isPilot ? "pilot" : "market_uncertainty";
  return {
    ...action,
    phase,
    dependsOn: isSupplier ? ["validate-workshop-usage"] : [],
    blockedBy: isSupplier ? ["MVP scope not approved", "No pitchable demo", "No outreach", "No pilot workshop", "No real purchasing data"] : [],
    unlocks: isSupplier ? ["Future Revenue Machine"] : ["Market Thesis"],
    completionCriteria: isSupplier ? ["Real purchasing data", "Supplier quotes", "Workshop buying willingness"] : [action.reason],
  };
}

function topRecommendation(strategy: ProductStrategy, fallback: string) {
  if (strategy.currentProductStage === "mvp_scope" && fallback === "Define and Build Free MVP") return "Define and Build Free MVP";
  if (strategy.currentProductStage === "mvp_scope") return "Define MVP";
  if (strategy.currentProductStage === "demo_build") return "Build Demo";
  if (strategy.currentProductStage === "pitching") return "Start Pitching";
  if (strategy.currentProductStage === "pilot") return "Run Pilot";
  if (strategy.currentProductStage === "scale") return "Scale";
  if (fallback.toLowerCase().includes("reject")) return "Reject";
  if (fallback.toLowerCase().includes("pause")) return "Pause";
  return "Continue Research";
}

function isArchivedBusinessModelAssumption(title: string, status?: string) {
  const text = `${title} ${status ?? ""}`.toLowerCase();
  return text.includes("archived") || text.includes("php 500") || text.includes("php 1,500") || text.includes("php 1500") || text.includes("willingness to pay");
}

function isArchivedCoverageCategory(category: string, label: string, freshnessStatus: string) {
  const text = `${category} ${label} ${freshnessStatus}`.toLowerCase();
  return text.includes("archived") || text.includes("willingness_to_pay") || text.includes("willingness to pay");
}

function recommendationTone(recommendation: string): "good" | "watch" | "risk" {
  if (["Reject", "Pause"].includes(recommendation)) return "risk";
  if (["Scale", "Run Pilot"].includes(recommendation)) return "good";
  return "watch";
}
