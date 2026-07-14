import { getInvestmentCommitteeData } from "@/lib/investment/committee";
import { InvestmentCommitteeMeetingClient } from "@/app/investment-committee/meeting/meeting-client";

export const dynamic = "force-dynamic";

export default async function InvestmentCommitteeMeetingPage() {
  const data = await getInvestmentCommitteeData();
  const workshop = data.markets.find((market) => market.slug === "workshop") ?? data.markets[0];
  const beauty = data.markets.find((market) => market.slug === "beauty") ?? data.markets[1] ?? data.markets[0];

  const sections = [
    {
      title: "Portfolio overview",
      eyebrow: "Investment Committee",
      body: `${data.markets.length} markets are ranked with local SQLite evidence. Current leader: ${data.summary.leadingMarket.name}.`,
      bullets: data.markets.slice(0, 4).map((market, index) => `${index + 1}. ${market.name}: D${Math.round(market.decisionScore)} / C${Math.round(market.confidence)}%`),
    },
    {
      title: "Current ranking",
      eyebrow: "Final Ranking",
      body: "Decision Score is the primary rank, with confidence and Market Score as tie-breaks.",
      bullets: data.markets.map((market, index) => `${index + 1}. ${market.name} - ${market.suggestedRecommendation}`),
    },
    {
      title: "Finalists",
      eyebrow: "Head-to-head",
      body: `${workshop.name} and ${beauty.name} are the default finalists for the committee discussion.`,
      bullets: [`${workshop.name}: D${Math.round(workshop.decisionScore)}, ${workshop.topReasonToPursue}`, `${beauty.name}: D${Math.round(beauty.decisionScore)}, ${beauty.topReasonToPursue}`],
    },
    {
      title: `Why ${workshop.name}`,
      eyebrow: "Build thesis",
      body: workshop.memo.thesis,
      bullets: workshop.reasonsToPursue.slice(0, 4),
    },
    {
      title: `Why ${beauty.name}`,
      eyebrow: "Validation thesis",
      body: beauty.memo.thesis,
      bullets: beauty.reasonsToPursue.slice(0, 4),
    },
    {
      title: "Contradicting evidence",
      eyebrow: "Challenge",
      body: "The strongest opposing evidence should guide next research before committing to Build.",
      bullets: [...workshop.reasonsToReject.slice(0, 3), ...beauty.reasonsToReject.slice(0, 3)],
    },
    {
      title: "Critical unknowns",
      eyebrow: "Uncertainty",
      body: "Open unknowns are ranked by decision impact and confidence gap.",
      bullets: data.markets.flatMap((market) => market.criticalUnknowns.slice(0, 2).map((unknown) => `${market.name}: ${unknown.title}`)).slice(0, 8),
    },
    {
      title: "Kill criteria",
      eyebrow: "Reject gates",
      body: "Triggered or warning kill criteria require explicit committee review.",
      bullets: data.markets.flatMap((market) => market.killCriteria.map((criterion) => `${market.name}: ${criterion.title} (${criterion.status})`)).slice(0, 8),
    },
    {
      title: "Scenario analysis",
      eyebrow: "Sensitivity",
      body: data.gap?.reversalStatement ?? "Scenario results are deterministic and local.",
      bullets: workshop.sensitivity.slice(0, 5).map((item) => `${item.label}: +${item.upsideImpact} / -${item.downsideImpact}`),
    },
    {
      title: "Final recommendation",
      eyebrow: "Committee call",
      body: `${data.summary.leadingMarket.name} is the current calculated leader. Stored recommendations still require formal approval to change.`,
      bullets: [`Status: ${data.summary.finalRecommendationStatus}`, `Decision Score: ${Math.round(data.summary.leadingMarket.decisionScore)}`, `Confidence: ${Math.round(data.summary.leadingMarket.confidence)}%`],
    },
    {
      title: "Next action",
      eyebrow: "Before final decision",
      body: "Resolve the highest-impact research actions before locking a Build decision.",
      bullets: data.markets.flatMap((market) => market.nextActions.slice(0, 1).map((action) => `${market.name}: ${action.title}`)).slice(0, 6),
    },
  ];

  return <InvestmentCommitteeMeetingClient sections={sections} />;
}
