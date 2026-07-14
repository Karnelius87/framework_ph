import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/lib/db";
import { DecisionLogClient } from "@/app/decisions/decision-log-client";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const decisions = await getDb().decisionLog.findMany({
    orderBy: { approvedAt: "desc" },
    include: { market: true },
  });

  return (
    <div>
      <PageHeader title="Decision Log" description="Chronological investment committee decisions, separate from the research timeline." icon={ClipboardList} />
      <div className="p-4 lg:p-6">
        <DecisionLogClient rows={decisions.map((decision) => ({
          id: decision.id,
          market: decision.market.name,
          marketSlug: decision.market.slug,
          title: decision.title,
          decision: decision.decision,
          decisionType: decision.decisionType,
          approvedBy: decision.approvedBy,
          approvedAt: decision.approvedAt.toISOString().slice(0, 10),
          reversible: decision.reversible,
        }))} />
      </div>
    </div>
  );
}
