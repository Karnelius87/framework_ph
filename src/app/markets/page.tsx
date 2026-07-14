import { BarChart3 } from "lucide-react";
import { MarketsTable } from "@/components/app/markets-table";
import { PageHeader } from "@/components/app/page-header";
import { calculateWeightedMarketScore } from "@/config/scoring";
import { markets } from "@/data/research";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const dbMarkets = await getDb().market.findMany({
    include: {
      decisionMetric: true,
      scores: { include: { scoreCategory: true } },
      killCriteria: true,
      imports: { orderBy: { importedAt: "desc" }, take: 1 },
    },
  });
  const dbBySlug = Object.fromEntries(dbMarkets.map((market) => [market.slug, market]));
  const rows = markets.map((market) => {
    const dbMarket = dbBySlug[market.slug];
    const latestResearchDate = latestDate([
      dbMarket?.updatedAt,
      dbMarket?.imports[0]?.importedAt,
      dbMarket?.imports[0]?.researchDate,
    ]);
    return {
      ...market,
      totalMarketScore: dbMarket?.scores.length ? calculateWeightedMarketScore(dbMarket.scores.map((score) => ({ key: score.scoreCategory.key, score: score.score }))) : market.score,
      decisionScore: dbMarket?.decisionMetric?.decisionScore,
      killCriteriaStatus: dbMarket?.killCriteria.some((item) => item.status === "triggered") ? "Triggered" : "Monitoring",
      updatedAt: latestResearchDate ? latestResearchDate.toLocaleDateString("sv-SE") : market.updatedAt,
    };
  });

  return (
    <div>
      <PageHeader
        title="Markets"
        description="Search, filter, sort, and open detailed investment reports for every screened vertical."
        icon={BarChart3}
      />
      <div className="p-4 lg:p-6">
        <MarketsTable markets={rows} />
      </div>
    </div>
  );
}

function latestDate(values: Array<Date | undefined>) {
  const dates = values.filter((value): value is Date => value instanceof Date);
  if (!dates.length) return undefined;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}
