import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, CalendarClock, CheckCircle2, ListTodo, Route, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { AiPanel } from "@/components/app/ai-panel";
import { ExplainableMetric } from "@/components/app/explainable-metric";
import { PageHeader } from "@/components/app/page-header";
import { CompletenessChart, MarketScoresChart } from "@/components/charts/research-charts";
import { calculateWeightedMarketScore } from "@/config/scoring";
import { markets } from "@/data/research";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

type DashboardRow = {
  slug: string;
  name: string;
  status: string;
  stage: string;
  recommendation: string;
  totalMarketScore: number;
  decisionScore: number;
  confidence: number;
  completeness: number;
  customerValidation: number;
  competitorCoverage: number;
  chance: number;
  killStatus: "Triggered" | "Warning" | "Monitoring";
  criticalUnknowns: number;
  openUnknowns: number;
  openActions: number;
  topReason: string;
  topRisk: string;
  nextAction: string;
  competitors: string[];
};

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      text: "text-emerald-300",
      bg: "bg-emerald-400",
      soft: "border-emerald-500/40 bg-emerald-500/10",
      pill: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      bar: "[&_[data-slot=progress-indicator]]:bg-emerald-400",
      label: "Strong pursue",
    };
  }
  if (score >= 70) {
    return {
      text: "text-cyan-300",
      bg: "bg-cyan-400",
      soft: "border-cyan-500/40 bg-cyan-500/10",
      pill: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
      bar: "[&_[data-slot=progress-indicator]]:bg-cyan-400",
      label: "Validate next",
    };
  }
  if (score >= 60) {
    return {
      text: "text-amber-300",
      bg: "bg-amber-400",
      soft: "border-amber-500/40 bg-amber-500/10",
      pill: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      bar: "[&_[data-slot=progress-indicator]]:bg-amber-400",
      label: "Selective watch",
    };
  }
  return {
    text: "text-rose-300",
    bg: "bg-rose-400",
    soft: "border-rose-500/40 bg-rose-500/10",
    pill: "border-rose-500/40 bg-rose-500/10 text-rose-200",
    bar: "[&_[data-slot=progress-indicator]]:bg-rose-400",
    label: "Do not pursue",
  };
}

export default async function DashboardPage() {
  const dbMarkets = await getDb().market.findMany({
    include: {
      scores: { include: { scoreCategory: true } },
      decisionMetric: true,
      criticalUnknowns: true,
      killCriteria: true,
      strategicAdvantages: { orderBy: { confidence: "desc" } },
      strategicDisadvantages: { orderBy: { confidence: "desc" } },
      researchActions: { orderBy: [{ priority: "desc" }, { estimatedImpact: "desc" }, { createdAt: "desc" }] },
      competitors: { orderBy: { company: "asc" } },
    },
  });

  const dbBySlug = Object.fromEntries(dbMarkets.map((market) => [market.slug, market]));
  const rows: DashboardRow[] = markets.map((market) => {
    const dbMarket = dbBySlug[market.slug];
    const totalMarketScore = dbMarket?.scores.length
      ? calculateWeightedMarketScore(dbMarket.scores.map((score) => ({ key: score.scoreCategory.key, score: score.score })))
      : market.score;
    const openUnknowns = dbMarket?.criticalUnknowns.filter((item) => !["validated", "disproven"].includes(item.status)) ?? [];
    const openActions = dbMarket?.researchActions.filter((item) => !["completed", "dismissed"].includes(item.status)) ?? [];
    const triggeredKill = dbMarket?.killCriteria.some((item) => item.status === "triggered");
    const warningKill = dbMarket?.killCriteria.some((item) => item.status === "warning");

    return {
      slug: market.slug,
      name: market.name,
      status: dbMarket?.status ?? market.status,
      stage: dbMarket?.stage ?? market.stage,
      recommendation: dbMarket?.recommendation ?? market.recommendation,
      totalMarketScore: Math.round(totalMarketScore),
      decisionScore: Math.round(dbMarket?.decisionMetric?.decisionScore ?? totalMarketScore),
      confidence: Math.round(dbMarket?.decisionMetric?.confidence ?? market.confidence),
      completeness: Math.round(dbMarket?.decisionMetric?.researchCompleteness ?? market.completeness),
      customerValidation: Math.round(dbMarket?.decisionMetric?.customerValidation ?? market.quality.customerValidation),
      competitorCoverage: Math.round(dbMarket?.decisionMetric?.competitorCoverage ?? market.quality.competitorCoverage),
      chance: Math.round(dbMarket?.decisionMetric?.chanceOfBecomingNumberOne ?? market.chance),
      killStatus: triggeredKill ? "Triggered" : warningKill ? "Warning" : "Monitoring",
      criticalUnknowns: openUnknowns.filter((item) => item.importance === "critical").length,
      openUnknowns: openUnknowns.length,
      openActions: openActions.length,
      topReason: dbMarket?.strategicAdvantages[0]?.title ?? market.strengths[0] ?? "No structured reason yet",
      topRisk: dbMarket?.strategicDisadvantages[0]?.title ?? market.weaknesses[0] ?? "No structured risk yet",
      nextAction: openActions[0]?.title ?? "Generate or approve a next research action",
      competitors: dbMarket?.competitors.map((competitor) => competitor.company) ?? [],
    };
  });

  const pursuitRows = rows
    .filter((row) => row.status !== "Rejected" && row.killStatus !== "Triggered")
    .sort((a, b) => b.decisionScore - a.decisionScore);
  const topBusinesses = pursuitRows.slice(0, 5);
  const best = topBusinesses[0];
  const progress = Math.round(rows.reduce((sum, item) => sum + item.completeness, 0) / rows.length);
  const averageDecisionScore = Math.round(rows.reduce((sum, item) => sum + item.decisionScore, 0) / rows.length);
  const activePursuits = pursuitRows.length;
  const criticalUnknowns = rows.reduce((sum, item) => sum + item.criticalUnknowns, 0);
  const openActions = rows.reduce((sum, item) => sum + item.openActions, 0);
  const highConfidenceCount = rows.filter((item) => item.confidence >= 70).length;
  const chartMarkets = markets.map((market) => {
    const row = rows.find((item) => item.slug === market.slug);
    return row ? { ...market, score: row.totalMarketScore, confidence: row.confidence, completeness: row.completeness } : market;
  });
  const leaderScore = topBusinesses[0]?.decisionScore ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Decision cockpit for choosing which vertical SaaS opportunities deserve pursuit now."
        icon={BarChart3}
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/investment-committee">Committee</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/actions"><ListTodo data-icon="inline-start" />Actions</Link>
          </>
        }
      />
      <div className="grid gap-4 p-4 lg:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <ExplainableMetric
            label="Best Pursuit"
            value={best?.name ?? "None"}
            detail={best ? `Decision ${best.decisionScore} / ${scoreTone(best.decisionScore).label}` : "No active market"}
            definition="The highest-ranking active market after excluding rejected markets and triggered kill criteria."
            formula="Sort active markets by Decision Score descending. Exclude status = Rejected and killStatus = Triggered."
            explanation={best ? `${best.name} is currently the strongest pursuit candidate because it has the highest active Decision Score and no triggered kill criterion.` : "No active pursuit candidate is currently available."}
            supportingEvidence={best ? [best.topReason] : []}
            opposingEvidence={best ? [best.topRisk] : []}
            linkedCompetitors={best?.competitors ?? []}
            criticalUnknowns={best && best.criticalUnknowns ? [`${best.criticalUnknowns} critical unknown(s)`] : []}
            openQuestions={best ? [best.nextAction] : []}
            navigation={best ? [{ label: `Open ${best.name}`, href: `/markets/${best.slug}`, description: "Drill into the market investment summary." }] : []}
            valueClassName={best ? scoreTone(best.decisionScore).text : undefined}
            indicatorClassName={best ? scoreTone(best.decisionScore).bg : undefined}
          />
          <ExplainableMetric
            label="Avg Decision Score"
            value={averageDecisionScore}
            detail="Live from decision metrics"
            definition="Portfolio-wide average of current Decision Scores."
            formula="sum(market.decisionScore) / number of markets"
            explanation="This shows whether the screened opportunity set is getting stronger or weaker after confidence, coverage, strategic fit, unknown penalties, and kill criteria are applied."
            supportingEvidence={topBusinesses.map((item) => `${item.name}: ${item.decisionScore}`)}
            missingEvidence={rows.filter((item) => item.confidence < 70).map((item) => `${item.name}: confidence ${item.confidence}%`)}
            navigation={[{ label: "Open Investment Committee", href: "/investment-committee", description: "Compare every market by decision readiness." }]}
            valueClassName={scoreTone(averageDecisionScore).text}
            indicatorClassName={scoreTone(averageDecisionScore).bg}
          />
          <ExplainableMetric
            label="Active Pursuits"
            value={activePursuits}
            detail="Not rejected or killed"
            definition="Markets still eligible for pursuit."
            formula="count(markets where status != Rejected and killStatus != Triggered)"
            explanation="This keeps rejected or kill-triggered markets out of the active pursuit queue without deleting them from the research corpus."
            supportingEvidence={pursuitRows.map((item) => item.name)}
            opposingEvidence={rows.filter((item) => item.status === "Rejected" || item.killStatus === "Triggered").map((item) => `${item.name}: ${item.status}/${item.killStatus}`)}
            navigation={[{ label: "Open Markets", href: "/markets", description: "Review every market status and score." }]}
          />
          <ExplainableMetric
            label="Critical Unknowns"
            value={criticalUnknowns}
            detail="Must reduce before conviction"
            definition="Open unknowns marked critical across all markets."
            formula="sum(open criticalUnknowns where status not in validated/disproven)"
            explanation="Critical unknowns represent the strongest blockers to investment conviction. They reduce Decision Score but never automatically reject a market."
            criticalUnknowns={rows.filter((item) => item.criticalUnknowns > 0).map((item) => `${item.name}: ${item.criticalUnknowns}`)}
            missingEvidence={rows.filter((item) => item.openUnknowns > 0).map((item) => `${item.name}: ${item.openUnknowns} open unknowns`)}
            navigation={[{ label: "Open Research Actions", href: "/research/actions", description: "Work the queue that closes unknowns." }]}
            valueClassName={criticalUnknowns ? "text-amber-300" : "text-emerald-300"}
            indicatorClassName={criticalUnknowns ? "bg-amber-400" : "bg-emerald-400"}
          />
          <ExplainableMetric
            label="Open Actions"
            value={openActions}
            detail="Research queue remaining"
            definition="Research actions that are not completed or dismissed."
            formula="count(researchActions where status not in completed/dismissed)"
            explanation="These are local research tasks generated from coverage gaps, unknowns, kill criteria, low confidence, missing interviews, and stale sources."
            supportingEvidence={topBusinesses.map((item) => `${item.name}: ${item.nextAction}`)}
            missingEvidence={rows.filter((item) => item.openActions === 0 && item.status !== "Rejected").map((item) => `${item.name}: no open next action`)}
            navigation={[{ label: "Open Action Center", href: "/research/actions", description: "Prioritize, start, block, or complete research tasks." }]}
          />
          <ExplainableMetric
            label="High Confidence"
            value={`${highConfidenceCount}/${rows.length}`}
            detail="Markets at 70%+ confidence"
            definition="Markets whose current research confidence is at or above the decision-quality threshold."
            formula="count(markets where confidence >= 70) / count(markets)"
            explanation="Confidence is separate from attractiveness. A strong market with low confidence should move to validation, not automatic build."
            supportingEvidence={rows.filter((item) => item.confidence >= 70).map((item) => `${item.name}: ${item.confidence}%`)}
            missingEvidence={rows.filter((item) => item.confidence < 70).map((item) => `${item.name}: ${item.confidence}%`)}
            navigation={[{ label: "Open Research Inbox", href: "/research/inbox", description: "Approve imported evidence that can raise confidence." }]}
          />
        </div>

        {best ? (
          <Card className={cn("border", scoreTone(best.decisionScore).soft)}>
            <CardContent className="grid gap-4 pt-6 xl:grid-cols-[1fr_260px_260px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={scoreTone(best.decisionScore).pill}>{scoreTone(best.decisionScore).label}</Badge>
                  <Badge variant="secondary">{best.stage}</Badge>
                  <Badge variant={best.killStatus === "Warning" ? "destructive" : "outline"}>{best.killStatus}</Badge>
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight">Pursue {best.name} first</h2>
                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  {best.topReason}. Main risk to watch: {best.topRisk}. Next practical move: {best.nextAction}.
                </p>
              </div>
              <DecisionMini label="Decision Score" value={best.decisionScore} tone={scoreTone(best.decisionScore).text} />
              <div className="grid gap-2 text-sm">
                <Row label="Confidence" value={`${best.confidence}%`} />
                <Row label="Research completeness" value={`${best.completeness}%`} />
                <Row label="#1 chance" value={`${best.chance}%`} />
                <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/markets/${best.slug}`}>
                  Open market <ArrowRight data-icon="inline-end" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Route className="size-4" />
              Decision ladder
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {topBusinesses.slice(0, 5).map((market, index) => {
              const tone = scoreTone(market.decisionScore);
              const gapToLeader = leaderScore - market.decisionScore;
              return (
                <Link
                  key={market.slug}
                  href={`/markets/${market.slug}`}
                  className="grid gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-accent lg:grid-cols-[34px_1fr_180px_220px]"
                >
                  <div className="flex size-8 items-center justify-center rounded-md border bg-muted font-mono text-sm text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{market.name}</span>
                      <Badge variant="outline" className={tone.pill}>{tone.label}</Badge>
                      {gapToLeader === 0 ? <Badge variant="secondary">Leader</Badge> : <Badge variant="outline">-{gapToLeader} vs leader</Badge>}
                      {market.criticalUnknowns ? <Badge variant="destructive">{market.criticalUnknowns} critical</Badge> : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{market.topReason}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={market.decisionScore} className={cn("w-full", tone.bar)} />
                      <span className={cn("shrink-0 font-mono text-sm font-semibold", tone.text)}>{market.decisionScore}</span>
                    </div>
                  </div>
                  <div className="grid gap-1 text-sm">
                    <Row label="Confidence" value={`${market.confidence}%`} />
                    <Row label="Complete" value={`${market.completeness}%`} />
                    <Row label="#1 chance" value={`${market.chance}%`} />
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Next move</div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{market.nextAction}</p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-sm">Market scores</CardTitle></CardHeader>
                <CardContent><MarketScoresChart markets={chartMarkets} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Research completeness</CardTitle></CardHeader>
                <CardContent><CompletenessChart markets={chartMarkets} /></CardContent>
              </Card>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <TrendingUp className="size-4" />
                    Top 5 businesses to pursue
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {topBusinesses.map((market, index) => {
                    const tone = scoreTone(market.decisionScore);
                    return (
                      <Link key={market.slug} href={`/markets/${market.slug}`} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-md border bg-background p-3 transition-colors hover:bg-accent">
                        <div className="font-mono text-sm text-muted-foreground">{index + 1}</div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-sm font-medium">{market.name}</div>
                            <Badge variant="outline" className={tone.pill}>{tone.label}</Badge>
                            {market.criticalUnknowns ? <Badge variant="destructive">{market.criticalUnknowns} critical</Badge> : null}
                          </div>
                          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{market.topReason}</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={market.decisionScore} className={cn("w-full", tone.bar)} />
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">D{market.decisionScore}</span>
                          </div>
                        </div>
                        <div className={`font-mono text-lg font-semibold ${tone.text}`}>{market.decisionScore}</div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CalendarClock className="size-4" />
                    Research progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div>
                    <div className="mb-2 flex justify-between text-sm">
                      <span>Overall completion</span>
                      <span className="font-mono">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <div className="grid gap-3">
                    <Signal icon={CheckCircle2} label="Best validated" value={rows.toSorted((a, b) => b.confidence - a.confidence)[0]?.name ?? "None"} />
                    <Signal icon={ShieldAlert} label="Most critical unknowns" value={rows.toSorted((a, b) => b.criticalUnknowns - a.criticalUnknowns)[0]?.name ?? "None"} />
                    <Signal icon={Target} label="Highest #1 chance" value={rows.toSorted((a, b) => b.chance - a.chance)[0]?.name ?? "None"} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <ListTodo className="size-4" />
                    Next actions that move the decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {topBusinesses.slice(0, 4).map((market) => (
                    <ActionRow key={market.slug} market={market.name} action={market.nextAction} href="/research/actions" />
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="size-4" />
                    What could stop us
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {topBusinesses.slice(0, 4).map((market) => (
                    <RiskRow key={market.slug} market={market.name} risk={market.topRisk} unknowns={market.openUnknowns} />
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
          <AiPanel />
        </div>
      </div>
    </div>
  );
}

function DecisionMini({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-4xl font-semibold", tone)}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-mono">{value}</span></div>;
}

function Signal({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" />{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function ActionRow({ market, action, href }: { market: string; action: string; href: string }) {
  return (
    <Link href={href} className="rounded-md border bg-background p-3 transition-colors hover:bg-accent">
      <div className="text-sm font-medium">{market}</div>
      <p className="mt-1 text-sm text-muted-foreground">{action}</p>
    </Link>
  );
}

function RiskRow({ market, risk, unknowns }: { market: string; risk: string; unknowns: number }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{market}</span>
        <Badge variant={unknowns ? "destructive" : "secondary"}>{unknowns} unknowns</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{risk}</p>
    </div>
  );
}
