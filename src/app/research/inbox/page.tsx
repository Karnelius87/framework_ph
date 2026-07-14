import { Inbox } from "lucide-react";
import { DecisionCard, ResearchActionCard } from "@/components/app/decision-cards";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/lib/db";
import { ResearchInboxTable } from "@/app/research/inbox/research-inbox-table";

export const dynamic = "force-dynamic";

export default async function ResearchInboxPage() {
  const imports = await getDb().researchImport.findMany({
    orderBy: { importedAt: "desc" },
    include: { items: true },
  });

  const rows = imports.map((item) => ({
    importId: item.importId,
    packageLabel: item.sequenceNumber ? `Research Package #${String(item.sequenceNumber).padStart(3, "0")}` : "Research Package",
    topic: item.topic,
    version: item.packageVersion,
    title: item.title,
    market: item.marketSlug,
    researchDate: item.researchDate.toISOString().slice(0, 10),
    researcher: item.researcher,
    claims: item.items.filter((child) => child.itemType === "claim").length,
    sources: item.items.filter((child) => child.itemType === "source").length,
    competitors: item.items.filter((child) => child.itemType === "competitor").length,
    scoreChanges: item.items.filter((child) => child.itemType === "suggested_score_change").length,
    decisionItems: item.items.filter((child) => ["critical_unknown", "kill_criterion", "why_we_win", "why_we_may_lose", "research_action", "coverage_update", "decision_log"].includes(child.itemType)).length,
    importStatus: item.importStatus,
    importedAt: item.importedAt.toISOString().slice(0, 16).replace("T", " "),
  }));
  const pending = rows.filter((item) => item.importStatus === "pending_review").length;
  const partiallyReviewed = rows.filter((item) => item.importStatus === "partially_reviewed").length;
  const approved = rows.filter((item) => item.importStatus === "approved").length;
  const done = rows.filter((item) => ["approved", "rejected", "archived"].includes(item.importStatus)).length;
  const nextPackage = rows.find((item) => ["pending_review", "partially_reviewed"].includes(item.importStatus));

  return (
    <div>
      <PageHeader title="Research Inbox" description="Review imported research packages before anything becomes approved market intelligence." icon={Inbox} />
      <div className="grid gap-4 p-4 lg:p-6">
        <section className="grid gap-3 md:grid-cols-4">
          <DecisionCard label="Pending" value={pending} tone={pending ? "watch" : "good"} />
          <DecisionCard label="Reviewing" value={partiallyReviewed} tone={partiallyReviewed ? "watch" : "neutral"} />
          <DecisionCard label="Approved" value={approved} tone="good" />
          <DecisionCard label="Done" value={done} tone="neutral" />
        </section>
        <section className="grid gap-3 rounded-md border bg-card p-4 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="text-sm font-medium">Review workflow</div>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              {["Pending", "Review", "Approve", "Done"].map((step, index) => (
                <div key={step} className="rounded-md border bg-background p-3 text-sm">
                  <div className="font-mono text-xs text-muted-foreground">0{index + 1}</div>
                  <div className="mt-1 font-medium">{step}</div>
                </div>
              ))}
            </div>
          </div>
          <ResearchActionCard
            title="Next package to review"
            action={nextPackage ? `${nextPackage.packageLabel}: ${nextPackage.title}` : "No package is waiting for review."}
            priority={nextPackage?.importStatus.replace("_", " ")}
          />
        </section>
        <ResearchInboxTable imports={rows} />
      </div>
    </div>
  );
}
