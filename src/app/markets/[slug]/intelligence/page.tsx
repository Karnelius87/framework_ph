import Link from "next/link";
import { notFound } from "next/navigation";
import { Network, Route } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { markets } from "@/data/research";
import { buildInitialMarketGraph } from "@/lib/intelligence/graph";
import { getDb } from "@/lib/db";
import { IntelligenceGraphClient } from "@/app/markets/[slug]/intelligence/intelligence-graph-client";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return markets.map((market) => ({ slug: market.slug }));
}

export default async function IntelligencePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mode?: string; focus?: string; layout?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const market = await getDb().market.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, recommendation: true } });
  if (!market) notFound();

  const marketOptions = await getDb().market.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } });
  const initialGraph = await buildInitialMarketGraph(slug, {
    mode: query.mode === "decision" ? "decision" : query.mode === "source-impact" ? "source-impact" : "default",
    focusNodeId: query.focus,
    layout: query.layout === "decision" ? "decision" : undefined,
    includeSources: query.mode === "source-impact",
    limit: query.mode === "decision" ? 12 : 8,
  });

  return (
    <div>
      <PageHeader
        title={`${market.name} Intelligence Graph`}
        description="Progressive evidence graph from local SQLite: claims, sources, competitors, score impact, decisions, unknowns, and research packages."
        icon={Network}
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/markets/${slug}`}><Network data-icon="inline-start" />Market Summary</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/markets/${slug}/intelligence?mode=decision`}><Route data-icon="inline-start" />Decision Trace</Link>
          </>
        }
      />
      <div className="p-4 lg:p-6">
        <IntelligenceGraphClient marketSlug={slug} initialGraph={initialGraph} marketOptions={marketOptions} title={`${market.name} Intelligence`} />
      </div>
    </div>
  );
}
