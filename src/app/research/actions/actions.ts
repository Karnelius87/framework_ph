"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";

const allowedStatuses = new Set(["planned", "in_progress", "completed", "dismissed", "blocked"]);

export async function updateResearchActionStatusAction(actionId: string, status: string) {
  if (!allowedStatuses.has(status)) {
    return { success: false as const, error: "Unsupported research action status." };
  }

  const db = getDb();
  const action = await db.researchAction.update({
    where: { id: actionId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
    include: { market: true },
  });

  if (status === "completed") {
    await db.timelineEvent.create({
      data: {
        marketId: action.marketId,
        type: "research_action_completed",
        title: "Research action completed",
        description: action.title,
        linkedEntityType: "ResearchAction",
        linkedEntityId: action.id,
      },
    });
  }

  revalidatePath("/research/actions");
  revalidatePath(`/markets/${action.market.slug}`);
  revalidatePath("/investment-committee");

  return {
    success: true as const,
    action: {
      id: action.id,
      status: action.status,
      completedAt: action.completedAt?.toISOString() ?? null,
    },
  };
}
