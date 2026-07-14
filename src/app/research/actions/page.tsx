import { ListTodo } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/lib/db";
import { ResearchActionsClient } from "@/app/research/actions/research-actions-client";

export const dynamic = "force-dynamic";

export default async function ResearchActionsPage() {
  const actions = await getDb().researchAction.findMany({
    include: { market: true },
    orderBy: [{ priority: "desc" }, { estimatedImpact: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Research Action Center"
        description="Turn market unknowns into a focused queue of research tasks, validation work, and decision unlocks."
        icon={ListTodo}
      />
      <div className="p-4 lg:p-6">
        <ResearchActionsClient
          rows={actions.map((action) => ({
            id: action.id,
            marketSlug: action.market.slug,
            marketName: action.market.name,
            title: action.title,
            description: action.description,
            priority: action.priority,
            reason: action.reason,
            status: action.status,
            linkedCoverageCategory: action.linkedCoverageCategory,
            estimatedImpact: action.estimatedImpact,
            expectedConfidenceImprovement: action.expectedConfidenceImprovement,
            dueDate: action.dueDate?.toISOString().slice(0, 10) ?? null,
            completedAt: action.completedAt?.toISOString().slice(0, 10) ?? null,
          }))}
        />
      </div>
    </div>
  );
}
