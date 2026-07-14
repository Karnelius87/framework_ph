import Link from "next/link";
import { Network } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { buildInitialMarketGraph } from "@/lib/intelligence/graph";
import { getDb } from "@/lib/db";
import { IntelligenceGraphClient } from "@/app/markets/[slug]/intelligence/intelligence-graph-client";

export const dynamic = "force-dynamic";

export default async function GlobalIntelligencePage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const query = await searchParams;
  const marketOptions = await getDb().market.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } });
  const selectedMarket = query.market ?? marketOptions[0]?.slug;
  const initialGraph = selectedMarket
    ? await buildInitialMarketGraph(selectedMarket, { limit: 8 })
    : { nodes: [], edges: [], quality: { totalNodes: 0, totalEdges: 0, verifiedClaims: 0, unresolvedClaims: 0, orphanedClaims: 0, sourcesWithoutClaims: 0, claimsWithoutSources: 0, staleSources: 0, weakEvidenceCategories: 0, disconnectedCompetitors: 0, risksWithoutEvidence: 0, decisionsWithoutRationale: 0, scoreChangesWithoutClaims: 0, reportUpdatesWithoutEvidence: 0, unknownsWithoutValidationActions: 0 }, layout: "hierarchical" as const, warnings: ["No markets available."] };

  return (
    <div>
      <PageHeader
        title="Intelligence"
        description="Global relationship explorer. Start from a market, then expand competitors, claims, sources, score categories, risks, assumptions, unknowns, kill criteria, decisions, and research packages on demand."
        icon={Network}
        actions={
          <>
            {marketOptions.map((market) => (
              <Link key={market.slug} className={buttonVariants({ variant: market.slug === selectedMarket ? "default" : "outline", size: "sm" })} href={`/intelligence?market=${market.slug}`}>
                {market.name}
              </Link>
            ))}
          </>
        }
      />
      <div className="p-4 lg:p-6">
        <IntelligenceGraphClient marketSlug={selectedMarket} initialGraph={initialGraph} marketOptions={marketOptions} title="Global Intelligence" />
      </div>
    </div>
  );
}
