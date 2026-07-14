import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { RoadmapBoard, type RoadmapCard, type RoadmapColumn } from "@/components/app/roadmap-board";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const stages = [
  { key: "ideas", title: "Ideas" },
  { key: "screening", title: "Screening" },
  { key: "mini_research", title: "Mini Research" },
  { key: "deep_research", title: "Deep Research" },
  { key: "investment_ready", title: "Investment Ready" },
  { key: "rejected", title: "Rejected" },
] as const;

function stageKey(stage: string, status: string) {
  const value = `${stage} ${status}`.toLowerCase();
  if (value.includes("reject") || value.includes("archive")) return "rejected";
  if (value.includes("investment ready")) return "investment_ready";
  if (value.includes("deep")) return "deep_research";
  if (value.includes("mini")) return "mini_research";
  if (value.includes("screen")) return "screening";
  return "ideas";
}

export default async function RoadmapPage() {
  const db = getDb();
  const [markets, imports] = await Promise.all([
    db.market.findMany({
      orderBy: [{ stage: "asc" }, { score: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        stage: true,
        status: true,
        recommendation: true,
        decisionMetric: { select: { decisionScore: true, confidence: true } },
      },
    }),
    db.researchImport.findMany({
      where: { marketId: null },
      orderBy: { importedAt: "desc" },
      take: 20,
      select: {
        importId: true,
        title: true,
        marketSlug: true,
        topic: true,
        importStatus: true,
      },
    }),
  ]);

  const columns: RoadmapColumn[] = stages.map((stage) => ({ ...stage, cards: [] }));
  const columnByKey = new globalThis.Map(columns.map((column) => [column.key, column]));

  for (const item of imports) {
    const card: RoadmapCard = {
      id: item.importId,
      title: item.marketSlug || item.title,
      subtitle: `${item.title} - ${item.importStatus}`,
      source: "import",
      href: `/research/inbox/${item.importId}`,
      recommendation: item.topic,
    };
    columnByKey.get("ideas")?.cards.push(card);
  }

  for (const market of markets) {
    const key = stageKey(market.stage, market.status);
    const card: RoadmapCard = {
      id: market.id,
      title: market.name,
      subtitle: `D${Math.round(market.decisionMetric?.decisionScore ?? 0)} / C${Math.round(market.decisionMetric?.confidence ?? 0)}%`,
      source: "market",
      href: `/markets/${market.slug}`,
      recommendation: market.recommendation,
    };
    columnByKey.get(key)?.cards.push(card);
  }

  return (
    <div>
      <PageHeader
        title="Roadmap"
        description="Real pipeline from local SQLite. Ideas come from imported research packages that are not yet linked to a known market."
        icon={MapIcon}
        actions={(
          <>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/prompt-builder">Build prompt</Link>
            <Link className={buttonVariants({ variant: "default", size: "sm" })} href="/research/import">Import idea</Link>
          </>
        )}
      />
      <div className="grid gap-4 p-4 lg:p-6">
        <div className="rounded-md border bg-card p-4">
          <div className="text-sm font-medium">Import from Claude or ChatGPT</div>
          <ol className="mt-2 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <li>1. Ask for a White Space OS research package JSON.</li>
            <li>2. Paste it in Research Import and validate.</li>
            <li>3. Save to Inbox. New slugs stay here as Ideas until they are linked to a market.</li>
          </ol>
        </div>
        <RoadmapBoard columns={columns} />
      </div>
    </div>
  );
}
