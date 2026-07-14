"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { FileJson, FileText, GripVertical, Network, Save, Settings2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExplainableMetric } from "@/components/app/explainable-metric";
import { AdvancedDisclosure, DecisionCard, RecommendationCard, ResearchActionCard, UnknownCard } from "@/components/app/decision-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Recommendation = "Build" | "Validate" | "Watch" | "Reject" | "Paused";
type SortKey = "rank" | "marketScore" | "decisionScore" | "chance" | "confidence" | "completeness" | "customerValidation" | "competitorCoverage" | "founderFit" | "executionReadiness" | "marketFragmentation" | "workflowStickiness" | "competitionWhiteSpace" | "criticalUnknownCount";

type Contribution = {
  key: string;
  label: string;
  weight: number;
  rawScore: number;
  contribution: number;
  confidence: number;
  supportingClaims: number;
  opposingClaims: number;
  verifiedSources: number;
};

type CommitteeMarket = {
  id: string;
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
  suggestedRecommendation: Recommendation;
  quadrant: "Build" | "Validate" | "Watch" | "Reject";
  updatedAt: string;
  lastVerifiedAt: string | null;
  topReasonToPursue: string;
  topReasonToReject: string;
  reasonsToPursue: string[];
  reasonsToReject: string[];
  criticalUnknowns: { id: string; title: string; status: string; importance: string; confidenceGap: number; recommendedAction: string | null }[];
  killCriteria: { id: string; title: string; status: string; severity: string; threshold: string; reviewerNote: string | null }[];
  nextActions: { id: string; title: string; priority: string; reason: string; estimatedImpact: number; expectedConfidenceImprovement: number; linkedUnknownId: string | null; linkedKillCriterionId: string | null }[];
  coverage: { label: string; score: number; targetScore: number; confidence: number; gaps: string; recommendedNextAction: string; evidenceCount: number; verifiedEvidenceCount: number }[];
  contributions: Contribution[];
  readiness: {
    overallPercentage: number;
    blockers: string[];
    missingValidation: string[];
    requiredActionBeforeBuild: string;
    items: { key: string; label: string; status: string; evidenceNote: string | null; requiredAction: string | null }[];
  };
  leadershipSubfactors: { key: string; label: string; score: number; weight: number; confidence: number; linkedClaims: string[]; linkedSources: string[]; reviewerNote: string | null }[];
  memo: {
    thesis: string;
    whyNow: string;
    whyThisMarket: string;
    whyWeCanWin: string;
    whyWeMayLose: string;
    topRisks: string[];
    criticalUnknowns: string[];
    killCriteria: string[];
    requiredValidation: string[];
    recommendedNextStep: string;
    currentRecommendation: string;
    recommendationConfidence: number;
  };
  recommendationHistory: { id: string; previousRecommendation: string; proposedRecommendation: string; rationale: string; approved: boolean; createdAt: string }[];
  scenarios: { id: string; name: string; assumptions: Record<string, unknown>; results: Record<string, unknown>; adjustments: { key: string; label: string; baseValue: number; value: number }[] }[];
  scenarioBase: Record<string, number>;
  scenarioResults: Record<string, { marketScore: number; decisionScore: number; chanceOfBecomingNumberOne: number; recommendation: string }>;
  sensitivity: { key: string; label: string; upsideImpact: number; downsideImpact: number }[];
  freshnessWarnings: string[];
  linkedClaims: string[];
  linkedSources: string[];
};

type CommitteeData = {
  markets: CommitteeMarket[];
  rows: CommitteeMarket[];
  finalists: string[];
  summary: {
    leadingMarket: CommitteeMarket;
    highestDecisionScore: CommitteeMarket;
    highestMarketScore: CommitteeMarket;
    highestChance: CommitteeMarket;
    mostResearchComplete: CommitteeMarket;
    highestCustomerValidation: CommitteeMarket;
    mostCriticalUnknowns: CommitteeMarket;
    triggeredKillMarkets: CommitteeMarket[];
    finalRecommendationStatus: Recommendation;
  };
  gap: {
    totalScoreGap: number;
    decisionScoreGap: number;
    confidenceGap: number;
    researchCompletenessGap: number;
    customerValidationGap: number;
    founderFitGap: number;
    executionReadinessGap: number;
    reversalStatement: string;
  } | null;
  snapshots: { id: string; title: string; notes: string | null; rankings: { rank: number; name: string; decisionScore: number }[]; createdAt: string }[];
  rankingSnapshots: { id: string; timestamp: string; rankingOrder: string[] }[];
  frameworkVersion: string;
};

const numericColumns: { key: SortKey; label: string }[] = [
  { key: "marketScore", label: "Market Score" },
  { key: "decisionScore", label: "Decision Score" },
  { key: "chance", label: "#1 Chance" },
  { key: "confidence", label: "Confidence" },
  { key: "completeness", label: "Completeness" },
  { key: "customerValidation", label: "Customer Validation" },
  { key: "competitorCoverage", label: "Competitor Coverage" },
  { key: "founderFit", label: "Founder Fit" },
  { key: "executionReadiness", label: "Execution" },
  { key: "marketFragmentation", label: "Fragmentation" },
  { key: "workflowStickiness", label: "Stickiness" },
  { key: "competitionWhiteSpace", label: "White Space" },
  { key: "criticalUnknownCount", label: "Unknowns" },
];

const axisOptions = [
  { key: "decisionScore", label: "Decision Score" },
  { key: "marketScore", label: "Market Score" },
  { key: "chance", label: "Chance of Becoming #1" },
  { key: "founderFit", label: "Founder Fit" },
  { key: "executionReadiness", label: "Execution Readiness" },
  { key: "customerValidation", label: "Customer Validation" },
  { key: "competitionWhiteSpace", label: "Competition / White Space" },
  { key: "workflowStickiness", label: "Workflow Stickiness" },
  { key: "confidence", label: "Research Confidence" },
  { key: "completeness", label: "Research Completeness" },
  { key: "competitorCoverage", label: "Competitor Coverage" },
  { key: "marketFragmentation", label: "Market Fragmentation" },
] as const;

const preferenceKey = "wsp.investmentCommittee.table.v2";
const primaryTableKeys = new Set(["decisionScore", "confidence", "criticalUnknownCount"]);

export function InvestmentCommitteeClient({ data }: { data: CommitteeData }) {
  const [activeOnly, setActiveOnly] = useState(true);
  const [deepResearch, setDeepResearch] = useState(false);
  const [investmentReady, setInvestmentReady] = useState(false);
  const [noTriggeredKills, setNoTriggeredKills] = useState(false);
  const [currentOnly, setCurrentOnly] = useState(false);
  const [recommendationFilter, setRecommendationFilter] = useState<Recommendation | "All">("All");
  const [decisionThreshold, setDecisionThreshold] = useState("0");
  const [confidenceThreshold, setConfidenceThreshold] = useState("0");
  const [completenessThreshold, setCompletenessThreshold] = useState("0");
  const [chanceThreshold, setChanceThreshold] = useState("0");
  const [marketThreshold, setMarketThreshold] = useState("0");
  const [sortKey, setSortKey] = useState<SortKey>("decisionScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => Object.fromEntries(numericColumns.map((column) => [column.key, true])));
  const [selectedMarketSlug, setSelectedMarketSlug] = useState(data.markets[0]?.slug ?? "");
  const [finalists, setFinalists] = useState<string[]>(data.finalists);
  const [xAxis, setXAxis] = useState("decisionScore");
  const [yAxis, setYAxis] = useState("confidence");
  const [snapshotNote, setSnapshotNote] = useState("");
  const [pendingChange, setPendingChange] = useState<{ market: CommitteeMarket; proposed: Recommendation } | null>(null);
  const [rationale, setRationale] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = window.localStorage.getItem(preferenceKey);
    if (!stored) return;
    try {
      const prefs = JSON.parse(stored) as { visibleColumns?: Record<string, boolean>; sortKey?: SortKey; sortDirection?: "asc" | "desc" };
      if (prefs.visibleColumns) setVisibleColumns(prefs.visibleColumns);
      if (prefs.sortKey) setSortKey(prefs.sortKey);
      if (prefs.sortDirection) setSortDirection(prefs.sortDirection);
    } catch {
      window.localStorage.removeItem(preferenceKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(preferenceKey, JSON.stringify({ visibleColumns, sortKey, sortDirection }));
  }, [visibleColumns, sortKey, sortDirection]);

  const selectedMarket = data.markets.find((market) => market.slug === selectedMarketSlug) ?? data.markets[0];
  const filtered = useMemo(() => {
    const rows = data.markets.filter((row) => (
      (!activeOnly || row.status !== "Rejected")
      && (!deepResearch || row.status === "Deep Research")
      && (!investmentReady || row.stage === "Investment Ready")
      && (!noTriggeredKills || !row.hasTriggeredKill)
      && (!currentOnly || row.freshnessWarnings.length === 0)
      && (recommendationFilter === "All" || row.suggestedRecommendation === recommendationFilter || row.recommendation === recommendationFilter)
      && row.decisionScore >= Number(decisionThreshold || 0)
      && row.confidence >= Number(confidenceThreshold || 0)
      && row.completeness >= Number(completenessThreshold || 0)
      && row.chance >= Number(chanceThreshold || 0)
      && row.marketScore >= Number(marketThreshold || 0)
    ));

    return [...rows].sort((a, b) => {
      const aValue = sortKey === "rank" ? data.markets.findIndex((market) => market.slug === a.slug) : Number(a[sortKey]);
      const bValue = sortKey === "rank" ? data.markets.findIndex((market) => market.slug === b.slug) : Number(b[sortKey]);
      return sortDirection === "desc" ? bValue - aValue : aValue - bValue;
    });
  }, [activeOnly, chanceThreshold, completenessThreshold, confidenceThreshold, currentOnly, data.markets, decisionThreshold, deepResearch, investmentReady, marketThreshold, noTriggeredKills, recommendationFilter, sortDirection, sortKey]);

  const finalistMarkets = finalists.map((slug) => data.markets.find((market) => market.slug === slug)).filter(Boolean) as CommitteeMarket[];
  const topTwo = data.markets.slice(0, 2);
  const advancedNumericColumns = numericColumns.filter((column) => !primaryTableKeys.has(column.key));
  const leader = data.summary.leadingMarket;
  const leaderNextAction = leader?.nextActions[0]?.title ?? "Resolve the highest-impact unknown before a final Build decision.";
  const leaderTopRisks = leader?.reasonsToReject.slice(0, 5) ?? [];
  const leaderUnknowns = leader?.criticalUnknowns.slice(0, 5) ?? [];
  const priorityActions = data.markets.flatMap((market) => market.nextActions.map((action) => ({ ...action, market: market.name, marketSlug: market.slug })))
    .sort((a, b) => (b.estimatedImpact + b.expectedConfidenceImprovement) - (a.estimatedImpact + a.expectedConfidenceImprovement))
    .slice(0, 8);

  function requestRecommendation(market: CommitteeMarket, proposed: Recommendation) {
    if (proposed === market.recommendation) return;
    setRationale("");
    setReviewerNote("");
    setPendingChange({ market, proposed });
  }

  function approveRecommendation() {
    if (!pendingChange) return;
    startTransition(async () => {
      const response = await fetch("/api/investment-committee/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketSlug: pendingChange.market.slug,
          proposedRecommendation: pendingChange.proposed,
          rationale,
          reviewerNote,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error ?? "Could not save recommendation change.");
        return;
      }
      setMessage("Recommendation change approved and written to Decision Log, Timeline, and Recommendation History. Refresh to see the updated ranking row.");
      setPendingChange(null);
    });
  }

  function saveSnapshot() {
    startTransition(async () => {
      const response = await fetch("/api/investment-committee/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: snapshotNote, finalists }),
      });
      setMessage(response.ok ? "Committee snapshot saved to local SQLite." : "Could not save committee snapshot.");
    });
  }

  return (
    <div className="grid gap-5">
      {message ? <div className="rounded-md border bg-card p-3 text-sm">{message}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <RecommendationCard
          title="What should we build?"
          recommendation={leader?.suggestedRecommendation ?? data.summary.finalRecommendationStatus}
          score={leader?.decisionScore}
          confidence={leader?.confidence}
          nextAction={leaderNextAction}
          href={leader ? `/markets/${leader.slug}` : undefined}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <DecisionCard label="Current #1" value={leader?.name ?? "None"} tone="good" />
          <DecisionCard label="Decision Score" value={Math.round(leader?.decisionScore ?? 0)} tone={(leader?.decisionScore ?? 0) >= 75 ? "good" : "watch"} />
          <DecisionCard label="Confidence" value={`${Math.round(leader?.confidence ?? 0)}%`} tone={(leader?.confidence ?? 0) >= 70 ? "good" : "watch"} />
          <ResearchActionCard title="Next Action" action={leaderNextAction} priority={leader?.nextActions[0]?.priority} />
          {leaderTopRisks.slice(0, 2).map((risk) => <UnknownCard key={risk} title={risk} severity="watch" />)}
          {leaderUnknowns.slice(0, 2).map((unknown) => <UnknownCard key={unknown.id} title={unknown.title} detail={unknown.recommendedAction ?? undefined} severity={unknown.importance === "critical" ? "risk" : "watch"} />)}
        </div>
      </section>

      <AdvancedDisclosure title="Supporting and advanced KPIs">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryMetric label="Leading Market" market={data.summary.leadingMarket} value={data.summary.leadingMarket?.name} detail={`${Math.round(data.summary.leadingMarket?.decisionScore ?? 0)} Decision Score`} />
          <SummaryMetric label="Highest Decision Score" market={data.summary.highestDecisionScore} value={Math.round(data.summary.highestDecisionScore?.decisionScore ?? 0)} />
          <SummaryMetric label="Highest Market Score" market={data.summary.highestMarketScore} value={Math.round(data.summary.highestMarketScore?.marketScore ?? 0)} />
          <SummaryMetric label="Highest Chance of Becoming #1" market={data.summary.highestChance} value={`${Math.round(data.summary.highestChance?.chance ?? 0)}%`} />
          <SummaryMetric label="Most Research Complete" market={data.summary.mostResearchComplete} value={`${Math.round(data.summary.mostResearchComplete?.completeness ?? 0)}%`} />
          <SummaryMetric label="Highest Customer Validation" market={data.summary.highestCustomerValidation} value={`${Math.round(data.summary.highestCustomerValidation?.customerValidation ?? 0)}%`} />
          <SummaryMetric label="Most Critical Unknowns" market={data.summary.mostCriticalUnknowns} value={data.summary.mostCriticalUnknowns?.criticalUnknownCount ?? 0} valueClassName="text-amber-500" />
          <ExplainableMetric
            label="Triggered Kill Criteria"
            value={data.summary.triggeredKillMarkets.length}
            detail={data.summary.triggeredKillMarkets.map((market) => market.name).join(", ") || "None triggered"}
            definition="Markets where at least one kill criterion is currently triggered."
            formula="Count markets with hasTriggeredKill = true."
            explanation="Triggered kill criteria block or downgrade a Build recommendation until reviewed."
            linkedClaims={data.summary.triggeredKillMarkets.map((market) => market.topReasonToReject)}
            criticalUnknowns={data.summary.triggeredKillMarkets.flatMap((market) => market.criticalUnknowns.map((unknown) => unknown.title))}
            confidence={data.summary.triggeredKillMarkets.length ? 80 : 100}
            lastUpdated={new Date().toLocaleDateString("sv-SE")}
          />
          <ExplainableMetric
            label="Final Recommendation Status"
            value={data.summary.finalRecommendationStatus}
            detail={`Calculated suggestion for ${data.summary.leadingMarket?.name}`}
            definition="Calculated suggestion based on Decision Score, research confidence, readiness, and kill criteria."
            formula="Build if Decision Score >= 75 and Confidence >= 70, Validate if score is strong but evidence is not ready, Watch for mid-score markets, Reject for score < 50 or triggered fatal criteria."
            explanation="This does not overwrite stored recommendations. Formal changes require the approval workflow below."
            confidence={data.summary.leadingMarket?.confidence}
            navigation={navFor(data.summary.leadingMarket)}
          />
        </section>
      </AdvancedDisclosure>

      <AdvancedDisclosure title="Filters and table settings">
      <section className="grid gap-3 rounded-md border bg-card p-3 xl:grid-cols-[1fr_auto]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Toggle label="Active markets only" checked={activeOnly} onChange={setActiveOnly} />
          <Toggle label="Deep research only" checked={deepResearch} onChange={setDeepResearch} />
          <Toggle label="Investment ready only" checked={investmentReady} onChange={setInvestmentReady} />
          <Toggle label="No triggered kill criteria" checked={noTriggeredKills} onChange={setNoTriggeredKills} />
          <Toggle label="Current data only" checked={currentOnly} onChange={setCurrentOnly} />
          <NativeSelect label="Recommendation" value={recommendationFilter} onChange={(value) => setRecommendationFilter(value as Recommendation | "All")} options={["All", "Build", "Validate", "Watch", "Reject", "Paused"]} />
          <NumberFilter label="Decision Score threshold" value={decisionThreshold} onChange={setDecisionThreshold} />
          <NumberFilter label="Confidence threshold" value={confidenceThreshold} onChange={setConfidenceThreshold} />
          <NumberFilter label="Completeness threshold" value={completenessThreshold} onChange={setCompletenessThreshold} />
          <NumberFilter label="Chance threshold" value={chanceThreshold} onChange={setChanceThreshold} />
          <NumberFilter label="Market score threshold" value={marketThreshold} onChange={setMarketThreshold} />
        </div>
        <div className="min-w-56 rounded-md border bg-background p-3">
          <div className="flex items-center gap-2 text-sm font-medium"><Settings2 className="size-4" /> Columns</div>
          <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
            {advancedNumericColumns.map((column) => (
              <Toggle key={column.key} label={column.label} checked={visibleColumns[column.key] !== false} onChange={(checked) => setVisibleColumns((current) => ({ ...current, [column.key]: checked }))} />
            ))}
          </div>
        </div>
      </section>
      </AdvancedDisclosure>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-md border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
            <div>
              <div className="font-semibold">Final Ranking</div>
              <div className="text-sm text-muted-foreground">Every score is clickable and explainable.</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect label="Sort" value={sortKey} onChange={(value) => setSortKey(value as SortKey)} options={numericColumns.map((column) => column.key)} optionLabels={Object.fromEntries(numericColumns.map((column) => [column.key, column.label]))} />
              <Button variant="outline" size="sm" onClick={() => setSortDirection((direction) => direction === "desc" ? "asc" : "desc")}>{sortDirection === "desc" ? "Desc" : "Asc"}</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead className="min-w-64">Market</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Decision Score</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead>Top Risk</TableHead>
                  <TableHead>Critical Unknowns</TableHead>
                  {advancedNumericColumns.map((column) => visibleColumns[column.key] !== false ? <TableHead key={column.key}>{column.label}</TableHead> : null)}
                  <TableHead>Research Stage</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Trace</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.slug} className={cn(row.slug === selectedMarketSlug && "bg-muted/40")}>
                    <TableCell className="font-mono">{data.markets.findIndex((market) => market.slug === row.slug) + 1}</TableCell>
                    <TableCell>
                      <button className="text-left" onClick={() => setSelectedMarketSlug(row.slug)}>
                        <span className="font-medium">{row.name}</span>
                        <span className="block text-xs text-muted-foreground">{row.topReasonToPursue}</span>
                        {row.freshnessWarnings.length ? <span className="mt-1 block text-xs text-amber-500">{row.freshnessWarnings[0]}</span> : null}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(row.suggestedRecommendation)}>{row.suggestedRecommendation}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">Stored: {row.recommendation}</div>
                    </TableCell>
                    <TableCell><ExplainCell market={row} metricKey="decisionScore" label="Decision Score" value={row.decisionScore} /></TableCell>
                    <TableCell><ExplainCell market={row} metricKey="confidence" label="Confidence" value={row.confidence} suffix="%" /></TableCell>
                    <TableCell className="min-w-56 text-sm">{row.nextActions[0]?.title ?? "No next action"}</TableCell>
                    <TableCell className="min-w-56 text-sm text-muted-foreground">{row.topReasonToReject}</TableCell>
                    <TableCell><ExplainCell market={row} metricKey="criticalUnknownCount" label="Critical Unknowns" value={row.criticalUnknownCount} /></TableCell>
                    {advancedNumericColumns.map((column) => visibleColumns[column.key] !== false ? (
                      <TableCell key={column.key}>
                        <ExplainCell market={row} metricKey={column.key} label={column.label} value={Number(row[column.key as keyof CommitteeMarket] ?? 0)} suffix={percentColumn(column.key) ? "%" : ""} />
                      </TableCell>
                    ) : null)}
                    <TableCell><Badge variant="outline">{row.stage}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(row.updatedAt).toLocaleDateString("sv-SE")}</TableCell>
                    <TableCell>
                      <Link className="text-primary" href={`/markets/${row.slug}/intelligence?mode=decision`}>Decision Trace</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <MarketPanel market={selectedMarket} onPropose={requestRecommendation} />
      </section>

      <AdvancedDisclosure title="Advanced decision tools: quadrant and lanes">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <DecisionQuadrant rows={filtered} selectedSlug={selectedMarketSlug} setSelected={setSelectedMarketSlug} xAxis={xAxis} yAxis={yAxis} setXAxis={setXAxis} setYAxis={setYAxis} />
          <DecisionLanes rows={data.markets} onDrop={requestRecommendation} />
        </section>
      </AdvancedDisclosure>

      <AdvancedDisclosure title="Advanced finalist comparison">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Finalists Comparison</h2>
            <p className="text-sm text-muted-foreground">Default finalists are Workshop and Beauty. Select up to four markets.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.markets.map((market) => (
              <Button
                key={market.slug}
                variant={finalists.includes(market.slug) ? "default" : "outline"}
                size="sm"
                onClick={() => setFinalists((current) => current.includes(market.slug) ? current.filter((slug) => slug !== market.slug) : current.length < 4 ? [...current, market.slug] : current)}
              >
                {market.name}
              </Button>
            ))}
          </div>
        </div>
        <FinalistsComparison markets={finalistMarkets} />
      </section>
      </AdvancedDisclosure>

      <AdvancedDisclosure title="Advanced scoring, readiness, memo, scenarios, and history">
      <section className="grid gap-4 xl:grid-cols-2">
        <WeightedContribution markets={finalistMarkets} />
        <DecisionReadiness markets={finalistMarkets} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <InvestmentMemo markets={finalistMarkets} />
        <ScenarioAnalysis market={selectedMarket} allMarkets={data.markets} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SensitivityAndGap data={data} topTwo={topTwo} />
        <Snapshots snapshots={data.snapshots} rankingSnapshots={data.rankingSnapshots} note={snapshotNote} setNote={setSnapshotNote} onSave={saveSnapshot} isPending={isPending} />
      </section>
      </AdvancedDisclosure>

      <section className="rounded-md border bg-card p-4">
        <h2 className="text-lg font-semibold">Next Research Before Final Decision</h2>
        <div className="mt-3 grid gap-2">
          {priorityActions.map((action) => (
            <div key={`${action.marketSlug}-${action.id}`} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[180px_1fr_220px]">
              <div>
                <div className="font-medium">{action.market}</div>
                <Badge variant={action.priority === "critical" ? "destructive" : "outline"}>{action.priority}</Badge>
              </div>
              <div>
                <div className="font-medium">{action.title}</div>
                <div className="text-sm text-muted-foreground">{action.reason}</div>
              </div>
              <div className="text-sm">
                <div>Score impact: <span className="font-mono">{action.estimatedImpact}</span></div>
                <div>Confidence gain: <span className="font-mono">{action.expectedConfidenceImprovement}</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {pendingChange ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-md border bg-card p-4 shadow-2xl">
            <h2 className="text-lg font-semibold">Approve Recommendation Change</h2>
            <p className="mt-1 text-sm text-muted-foreground">This writes a Decision Log entry, Timeline event, and Recommendation History record.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">Current</div>
                <div className="text-lg font-semibold">{pendingChange.market.recommendation}</div>
              </div>
              <div className="rounded-md border bg-background p-3">
                <div className="text-xs text-muted-foreground">Proposed</div>
                <div className="text-lg font-semibold">{pendingChange.proposed}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <EvidenceList title="Evidence supporting the change" items={[pendingChange.market.topReasonToPursue, ...pendingChange.market.reasonsToPursue]} />
              <EvidenceList title="Risks and contradicting evidence" items={[pendingChange.market.topReasonToReject, ...pendingChange.market.criticalUnknowns.map((unknown) => unknown.title)]} />
              <Textarea placeholder="Required rationale" value={rationale} onChange={(event) => setRationale(event.target.value)} />
              <Textarea placeholder="Reviewer note" value={reviewerNote} onChange={(event) => setReviewerNote(event.target.value)} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingChange(null)}>Cancel</Button>
              <Button disabled={isPending || rationale.trim().length < 12} onClick={approveRecommendation}>Confirm Approval</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryMetric({ label, market, value, detail, valueClassName }: { label: string; market: CommitteeMarket; value: string | number; detail?: string; valueClassName?: string }) {
  return (
    <ExplainableMetric
      label={label}
      value={value}
      detail={detail ?? market?.name}
      definition={`${label} among all markets included in the Investment Committee ranking.`}
      formula="Current ranking uses Decision Score first, then confidence, then Market Score as tie-break."
      explanation={`${market?.name} currently leads this KPI based on local SQLite score, evidence, and readiness data.`}
      linkedClaims={market?.linkedClaims ?? []}
      supportingEvidence={market?.reasonsToPursue ?? []}
      opposingEvidence={market?.reasonsToReject ?? []}
      linkedSources={market?.linkedSources ?? []}
      confidence={market?.confidence}
      criticalUnknowns={market?.criticalUnknowns?.map((unknown) => unknown.title) ?? []}
      gaps={market?.coverage?.map((coverage) => coverage.gaps).filter(Boolean) ?? []}
      lastUpdated={market?.updatedAt ? new Date(market.updatedAt).toLocaleDateString("sv-SE") : undefined}
      navigation={navFor(market)}
      intelligenceHref={market ? `/markets/${market.slug}/intelligence?mode=decision` : undefined}
      valueClassName={valueClassName}
      indicatorClassName={scoreDot(market?.decisionScore ?? 0)}
    />
  );
}

function ExplainCell({ market, metricKey, label, value, suffix = "" }: { market: CommitteeMarket; metricKey: SortKey; label: string; value: number; suffix?: string }) {
  return (
    <ExplainableMetric
      variant="inline"
      label={`${market.name} ${label}`}
      value={`${Math.round(value)}${suffix}`}
      definition={`${label} for ${market.name}.`}
      formula={metricFormula(metricKey)}
      explanation="This value is pulled from the local committee data model and participates in ranking, filtering, quadrant, or readiness logic."
      linkedClaims={market.linkedClaims}
      supportingEvidence={market.reasonsToPursue}
      opposingEvidence={market.reasonsToReject}
      linkedSources={market.linkedSources}
      confidence={market.confidence}
      criticalUnknowns={market.criticalUnknowns.map((unknown) => unknown.title)}
      gaps={market.freshnessWarnings}
      lastUpdated={new Date(market.updatedAt).toLocaleDateString("sv-SE")}
      navigation={navFor(market)}
      intelligenceHref={`/markets/${market.slug}/intelligence?mode=decision`}
      indicatorClassName={scoreDot(value)}
    />
  );
}

function MarketPanel({ market, onPropose }: { market: CommitteeMarket; onPropose: (market: CommitteeMarket, proposed: Recommendation) => void }) {
  return (
    <aside className="grid gap-3 rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{market.name}</h2>
          <p className="text-sm text-muted-foreground">Selected market drill-down</p>
        </div>
        <Badge variant={badgeVariant(market.suggestedRecommendation)}>{market.suggestedRecommendation}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Decision" value={market.decisionScore} />
        <MiniStat label="Score" value={market.marketScore} />
        <MiniStat label="Conf." value={`${market.confidence}%`} />
      </div>
      <EvidenceList title="Reasons to pursue" items={market.reasonsToPursue} />
      <EvidenceList title="Reasons to reject" items={market.reasonsToReject} />
      <EvidenceList title="Critical unknowns" items={market.criticalUnknowns.map((unknown) => `${unknown.title} (${unknown.importance})`)} />
      <EvidenceList title="Kill criteria" items={market.killCriteria.map((criterion) => `${criterion.title}: ${criterion.status}`)} />
      <EvidenceList title="Next research actions" items={market.nextActions.slice(0, 4).map((action) => action.title)} />
      <div className="grid grid-cols-2 gap-2">
        <Link className="inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-sm hover:bg-muted" href={`/markets/${market.slug}`}>Market Detail</Link>
        <Link className="inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-sm hover:bg-muted" href={`/markets/${market.slug}/intelligence?mode=decision`}><Network className="size-4" /> Graph</Link>
      </div>
      <div className="rounded-md border bg-background p-3">
        <div className="text-sm font-medium">Propose Recommendation</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["Build", "Validate", "Watch", "Reject", "Paused"] as Recommendation[]).map((recommendation) => (
            <Button key={recommendation} variant={recommendation === market.recommendation ? "secondary" : "outline"} size="sm" onClick={() => onPropose(market, recommendation)}>
              {recommendation}
            </Button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DecisionQuadrant({ rows, selectedSlug, setSelected, xAxis, yAxis, setXAxis, setYAxis }: {
  rows: CommitteeMarket[];
  selectedSlug: string;
  setSelected: (slug: string) => void;
  xAxis: string;
  yAxis: string;
  setXAxis: (value: string) => void;
  setYAxis: (value: string) => void;
}) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Decision Quadrant</h2>
          <p className="text-sm text-muted-foreground">Calculated suggestion only. It does not change stored recommendations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect label="X-axis" value={xAxis} onChange={setXAxis} options={axisOptions.map((option) => option.key)} optionLabels={Object.fromEntries(axisOptions.map((option) => [option.key, option.label]))} />
          <NativeSelect label="Y-axis" value={yAxis} onChange={setYAxis} options={axisOptions.map((option) => option.key)} optionLabels={Object.fromEntries(axisOptions.map((option) => [option.key, option.label]))} />
        </div>
      </div>
      <div className="relative mt-4 aspect-[1.6] min-h-80 rounded-md border bg-background">
        <div className="absolute inset-x-0 top-1/2 border-t" />
        <div className="absolute inset-y-0 left-1/2 border-l" />
        <QuadrantLabel className="left-3 top-3" label="Validate" />
        <QuadrantLabel className="right-3 top-3" label="Build" />
        <QuadrantLabel className="bottom-3 left-3" label="Reject" />
        <QuadrantLabel className="bottom-3 right-3" label="Watch" />
        {rows.map((row) => {
          const x = clamp(Number(row[xAxis as keyof CommitteeMarket] ?? 0));
          const y = clamp(Number(row[yAxis as keyof CommitteeMarket] ?? 0));
          return (
            <button
              key={row.slug}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-md border bg-card px-2 py-1 text-xs shadow-sm hover:ring-2 hover:ring-ring", selectedSlug === row.slug && "ring-2 ring-primary")}
              style={{ left: `${x}%`, bottom: `${y}%` }}
              onClick={() => setSelected(row.slug)}
              title={`${row.name}: ${Math.round(x)} / ${Math.round(y)}`}
            >
              {row.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DecisionLanes({ rows, onDrop }: { rows: CommitteeMarket[]; onDrop: (market: CommitteeMarket, proposed: Recommendation) => void }) {
  const lanes: Recommendation[] = ["Build", "Validate", "Watch", "Reject"];
  return (
    <section className="rounded-md border bg-card p-4">
      <h2 className="text-lg font-semibold">Build / Validate / Watch / Reject Lanes</h2>
      <p className="text-sm text-muted-foreground">Drag proposes a change and opens approval. Nothing is updated automatically.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {lanes.map((lane) => (
          <div
            key={lane}
            className="min-h-44 rounded-md border bg-background p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const slug = event.dataTransfer.getData("market");
              const market = rows.find((item) => item.slug === slug);
              if (market) onDrop(market, lane);
            }}
          >
            <div className="font-semibold">{lane}</div>
            <div className="mt-2 grid gap-2">
              {rows.filter((row) => row.suggestedRecommendation === lane).map((row) => (
                <div key={row.slug} draggable onDragStart={(event) => event.dataTransfer.setData("market", row.slug)} className="rounded-md border bg-card p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{row.name}</span>
                    <GripVertical className="size-4 text-muted-foreground" />
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-1 font-mono text-xs text-muted-foreground">
                    <span>D{Math.round(row.decisionScore)}</span>
                    <span>M{Math.round(row.marketScore)}</span>
                    <span>C{Math.round(row.confidence)}%</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{row.topReasonToPursue}</div>
                  <div className="mt-1 text-xs text-amber-500">{row.criticalUnknownCount} unknowns · {row.hasTriggeredKill ? "Kill triggered" : "No trigger"}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalistsComparison({ markets }: { markets: CommitteeMarket[] }) {
  const radar = ["marketScore", "decisionScore", "chance", "confidence", "customerValidation", "competitorCoverage", "founderFit", "executionReadiness"].map((key) => ({
    metric: key.replace(/([A-Z])/g, " $1"),
    ...Object.fromEntries(markets.map((market) => [market.name, Math.round(Number(market[key as keyof CommitteeMarket] ?? 0))])),
  }));
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="overflow-hidden rounded-md border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                {markets.map((market) => <TableHead key={market.slug}>{market.name}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {["marketScore", "decisionScore", "chance", "competitionWhiteSpace", "marketFragmentation", "workflowStickiness", "confidence", "completeness", "customerValidation", "competitorCoverage", "founderFit", "executionReadiness", "criticalUnknownCount"].map((key) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{metricLabel(key)}</TableCell>
                  {markets.map((market) => (
                    <TableCell key={market.slug}>
                      <ExplainCell market={market} metricKey={key as SortKey} label={metricLabel(key)} value={Number(market[key as keyof CommitteeMarket] ?? 0)} suffix={percentColumn(key) ? "%" : ""} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="rounded-md border bg-card p-3">
        <div className="font-semibold">Radar View</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
              {markets.map((market, index) => (
                <Radar key={market.slug} dataKey={market.name} stroke={index === 0 ? "var(--primary)" : "var(--chart-2)"} fill={index === 0 ? "var(--primary)" : "var(--chart-2)"} fillOpacity={0.18} />
              ))}
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function WeightedContribution({ markets }: { markets: CommitteeMarket[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <h2 className="text-lg font-semibold">Weighted Score Contribution</h2>
      <div className="mt-3 grid gap-3">
        {markets.map((market) => (
          <div key={market.slug} className="rounded-md border bg-background p-3">
            <div className="font-medium">{market.name}</div>
            <div className="mt-2 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={market.contributions.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="contribution" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid gap-1">
              {market.contributions.slice(0, 5).map((item, index) => (
                <div key={item.key} className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs">
                  <span>{index + 1}. {item.label}</span>
                  <span className="font-mono">{item.rawScore} x {item.weight}%</span>
                  <span className="font-mono">{item.contribution}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DecisionReadiness({ markets }: { markets: CommitteeMarket[] }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <h2 className="text-lg font-semibold">Decision Readiness</h2>
      <div className="mt-3 grid gap-3">
        {markets.map((market) => (
          <div key={market.slug} className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{market.name}</div>
              <div className="font-mono">{Math.round(market.readiness.overallPercentage)}%</div>
            </div>
            <Progress className="mt-2" value={market.readiness.overallPercentage} />
            <div className="mt-2 grid gap-1 text-xs">
              {market.readiness.items.slice(0, 6).map((item) => (
                <div key={item.key} className="flex justify-between gap-3">
                  <span>{item.label}</span>
                  <Badge variant={item.status === "sufficient" || item.status === "strong" ? "secondary" : "outline"}>{item.status}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-amber-500">{market.readiness.requiredActionBeforeBuild}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InvestmentMemo({ markets }: { markets: CommitteeMarket[] }) {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const memoMarkdown = markets.map((market) => `## ${market.name}\n\n### Thesis\n${editing[market.slug] ?? market.memo.thesis}\n\n### Why now\n${market.memo.whyNow}\n\n### Why this market\n${market.memo.whyThisMarket}\n\n### Why we can win\n${market.memo.whyWeCanWin}\n\n### Why we may lose\n${market.memo.whyWeMayLose}\n\n### Recommended next step\n${market.memo.recommendedNextStep}`).join("\n\n");
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Investment Committee Summary</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => download("investment-memo.md", memoMarkdown)}><FileText data-icon="inline-start" />Markdown</Button>
          <Button variant="outline" size="sm" onClick={() => download("investment-memo.json", JSON.stringify(markets.map((market) => market.memo), null, 2))}><FileJson data-icon="inline-start" />JSON</Button>
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        {markets.map((market) => (
          <div key={market.slug} className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{market.name}</div>
              <Badge variant="outline">{market.memo.currentRecommendation} · {market.memo.recommendationConfidence}%</Badge>
            </div>
            <Textarea className="mt-2 min-h-20" value={editing[market.slug] ?? market.memo.thesis} onChange={(event) => setEditing((current) => ({ ...current, [market.slug]: event.target.value }))} />
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              <MemoLine label="Why now" value={market.memo.whyNow} />
              <MemoLine label="Why this market" value={market.memo.whyThisMarket} />
              <MemoLine label="Why we can win" value={market.memo.whyWeCanWin} />
              <MemoLine label="Why we may lose" value={market.memo.whyWeMayLose} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScenarioAnalysis({ market, allMarkets }: { market: CommitteeMarket; allMarkets: CommitteeMarket[] }) {
  const [adjust, setAdjust] = useState({ totalMarketScore: 0, researchConfidence: 0, customerValidation: 0, criticalUnknownPenalty: 0 });
  const base = market.scenarioBase;
  const result = localScenario(base, adjust);
  const baseRank = allMarkets.findIndex((item) => item.slug === market.slug) + 1;
  const projectedRank = [...allMarkets.map((item) => ({ slug: item.slug, score: item.slug === market.slug ? result.decisionScore : item.decisionScore }))].sort((a, b) => b.score - a.score).findIndex((item) => item.slug === market.slug) + 1;
  return (
    <section className="rounded-md border bg-card p-4">
      <h2 className="text-lg font-semibold">Scenario Analysis</h2>
      <p className="text-sm text-muted-foreground">Local deterministic adjustments. Nothing persists unless saved later.</p>
      <div className="mt-3 grid gap-3">
        {[
          ["totalMarketScore", "Market Score"],
          ["researchConfidence", "Confidence"],
          ["customerValidation", "Customer Validation"],
          ["criticalUnknownPenalty", "Unknown Penalty"],
        ].map(([key, label]) => (
          <label key={key} className="grid gap-1 text-sm">
            <span>{label}: {adjust[key as keyof typeof adjust] > 0 ? "+" : ""}{adjust[key as keyof typeof adjust]}</span>
            <input suppressHydrationWarning type="range" min="-20" max="20" value={adjust[key as keyof typeof adjust]} onChange={(event) => setAdjust((current) => ({ ...current, [key]: Number(event.target.value) }))} />
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniStat label="Market Score" value={result.marketScore} />
        <MiniStat label="Decision Score" value={result.decisionScore} />
        <MiniStat label="Rank Change" value={`${baseRank} -> ${projectedRank}`} />
        <MiniStat label="Suggestion" value={result.recommendation} />
      </div>
      <div className="mt-3 grid gap-2">
        {Object.entries(market.scenarioResults).map(([name, scenario]) => (
          <div key={name} className="flex justify-between rounded-md border bg-background p-2 text-sm">
            <span className="capitalize">{name.replace(/([A-Z])/g, " $1")}</span>
            <span className="font-mono">D{scenario.decisionScore} · {scenario.recommendation}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SensitivityAndGap({ data, topTwo }: { data: CommitteeData; topTwo: CommitteeMarket[] }) {
  const leader = topTwo[0];
  return (
    <section className="rounded-md border bg-card p-4">
      <h2 className="text-lg font-semibold">Sensitivity and Decision Gap</h2>
      {data.gap ? (
        <div className="mt-2 rounded-md border bg-background p-3 text-sm">
          <div className="font-medium">{data.gap.reversalStatement}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <MiniStat label="Decision gap" value={data.gap.decisionScoreGap} />
            <MiniStat label="Confidence gap" value={data.gap.confidenceGap} />
            <MiniStat label="Completeness gap" value={data.gap.researchCompletenessGap} />
            <MiniStat label="Founder fit gap" value={data.gap.founderFitGap} />
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid gap-2">
        {leader?.sensitivity.slice(0, 6).map((item) => (
          <div key={item.key} className="grid grid-cols-[1fr_80px_80px] gap-2 rounded-md border bg-background p-2 text-sm">
            <span>{item.label}</span>
            <span className="font-mono text-emerald-500">+{item.upsideImpact}</span>
            <span className="font-mono text-amber-500">-{item.downsideImpact}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Snapshots({ snapshots, rankingSnapshots, note, setNote, onSave, isPending }: { snapshots: CommitteeData["snapshots"]; rankingSnapshots: CommitteeData["rankingSnapshots"]; note: string; setNote: (value: string) => void; onSave: () => void; isPending: boolean }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ranking Snapshots</h2>
        <Button size="sm" disabled={isPending} onClick={onSave}><Save data-icon="inline-start" />Save Committee Snapshot</Button>
      </div>
      <Textarea className="mt-3" placeholder="Snapshot notes" value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="mt-3 grid gap-2">
        {snapshots.map((snapshot) => (
          <div key={snapshot.id} className="rounded-md border bg-background p-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{snapshot.title}</span>
              <span className="text-muted-foreground">{new Date(snapshot.createdAt).toLocaleDateString("sv-SE")}</span>
            </div>
            <div className="mt-1 text-muted-foreground">{snapshot.rankings.slice(0, 3).map((item) => `${item.rank}. ${item.name}`).join(" · ")}</div>
          </div>
        ))}
        {rankingSnapshots.map((snapshot) => (
          <div key={snapshot.id} className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
            Ranking {new Date(snapshot.timestamp).toLocaleDateString("sv-SE")}: {snapshot.rankingOrder.slice(0, 4).join(" -> ")}
          </div>
        ))}
      </div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      {label}
    </label>
  );
}

function NumberFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <Input value={value} onChange={(event) => onChange(event.target.value)} inputMode="numeric" suppressHydrationWarning />
    </label>
  );
}

function NativeSelect({ label, value, onChange, options, optionLabels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; optionLabels?: Record<string, string> }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <select className="h-8 rounded-lg border bg-background px-2 text-sm text-foreground" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{optionLabels[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-background p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}

function EvidenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-2 grid gap-1">
        {items.length ? items.slice(0, 6).map((item, index) => <div key={`${item}-${index}`} className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">{item}</div>) : <div className="text-xs text-muted-foreground">No structured item yet.</div>}
      </div>
    </div>
  );
}

function MemoLine({ label, value }: { label: string; value: string }) {
  return <div><div className="font-medium">{label}</div><div className="text-muted-foreground">{value}</div></div>;
}

function QuadrantLabel({ label, className }: { label: string; className: string }) {
  return <div className={cn("absolute rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground", className)}>{label}</div>;
}

function badgeVariant(recommendation: string) {
  if (recommendation === "Build") return "secondary";
  if (recommendation === "Reject") return "destructive";
  return "outline";
}

function scoreDot(value: number) {
  if (value >= 75) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function percentColumn(key: string) {
  return !["marketScore", "decisionScore", "criticalUnknownCount"].includes(key);
}

function metricLabel(key: string) {
  return numericColumns.find((column) => column.key === key)?.label ?? key.replace(/([A-Z])/g, " $1");
}

function metricFormula(key: string) {
  if (key === "decisionScore") return "Market Score weighted with confidence, completeness, validation, competitor coverage, founder fit, execution readiness, then reduced by unknown and kill-criteria penalties.";
  if (key === "marketScore") return "Weighted category score using the active scoring framework.";
  if (key === "chance") return "Market leader probability subfactors, kept separate from Market Score.";
  return "Stored or derived committee metric from the local SQLite research model.";
}

function navFor(market?: CommitteeMarket) {
  if (!market) return [];
  return [
    { label: "Open Market Detail", href: `/markets/${market.slug}`, description: "Market thesis, evidence, scores, and actions." },
    { label: "View Claims", href: `/markets/${market.slug}/intelligence?nodeType=claim`, description: "Claims connected to this market." },
    { label: "View Sources", href: `/sources`, description: "Local evidence source register." },
    { label: "View Score History", href: `/markets/${market.slug}/metrics`, description: "Score changes and approval history." },
    { label: "View Decision Log", href: `/decisions`, description: "Formal decision log entries." },
  ];
}

function clamp(value: number) {
  return Math.max(4, Math.min(96, value));
}

function localScenario(base: Record<string, number>, adjust: Record<string, number>) {
  const next = {
    totalMarketScore: base.totalMarketScore + adjust.totalMarketScore,
    researchConfidence: base.researchConfidence + adjust.researchConfidence,
    researchCompleteness: base.researchCompleteness,
    customerValidation: base.customerValidation + adjust.customerValidation,
    competitorCoverage: base.competitorCoverage,
    executionReadiness: base.executionReadiness,
    founderFit: base.founderFit,
    chanceOfBecomingNumberOne: base.chanceOfBecomingNumberOne,
    criticalUnknownPenalty: base.criticalUnknownPenalty + adjust.criticalUnknownPenalty,
    killCriteriaPenalty: base.killCriteriaPenalty,
  };
  const decisionScore = Math.max(0, Math.min(100, Math.round(
    next.totalMarketScore * 0.45
    + next.researchConfidence * 0.15
    + next.researchCompleteness * 0.1
    + next.customerValidation * 0.1
    + next.competitorCoverage * 0.05
    + next.executionReadiness * 0.05
    + next.founderFit * 0.1
    - next.criticalUnknownPenalty
    - next.killCriteriaPenalty
  )));
  return {
    marketScore: Math.round(next.totalMarketScore),
    decisionScore,
    recommendation: decisionScore >= 75 && next.researchConfidence >= 70 ? "Build" : decisionScore >= 65 ? "Validate" : decisionScore < 50 ? "Reject" : "Watch",
  };
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: filename.endsWith(".json") ? "application/json" : "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
