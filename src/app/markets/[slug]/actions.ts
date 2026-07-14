"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMarket } from "@/data/research";
import { getDb } from "@/lib/db";
import { approveCurrentProductAction, approveProductStrategy } from "@/lib/research/product-strategy-approvals";
import { productStrategyFromSnapshot } from "@/lib/research/product-strategy";
import { reviewImportItem, saveResearchImport } from "@/lib/research/persistence";
import { researchPackageSchema } from "@/lib/research/schema";

export async function approveMvpScopeAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  await approveProductStrategyChange(slug, "current_action", "approve-workshop-mvp-scope");
  redirect(`/markets/${slug}`);
}

export async function approveProductStrategyAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const approvalType = String(formData.get("approvalType") ?? "product_strategy");
  const actionId = String(formData.get("actionId") ?? "");
  await approveProductStrategyChange(slug, approvalType, actionId);
  redirect(`/markets/${slug}`);
}

async function approveProductStrategyChange(slug: string, approvalType: string, actionId: string) {
  const db = getDb();
  const dbMarket = await db.market.findUnique({
    where: { slug },
    include: { productStrategySnapshot: true },
  });
  if (!dbMarket) throw new Error(`Market "${slug}" was not found.`);

  const staticMarket = getMarket(slug);
  const currentStrategy = dbMarket.productStrategySnapshot
    ? productStrategyFromSnapshot(dbMarket.productStrategySnapshot)
    : staticMarket?.productStrategy;
  if (!currentStrategy) throw new Error("No product strategy exists to approve.");

  const approvedStrategy = approvalType === "current_action"
    ? approveCurrentProductAction(currentStrategy, actionId)
    : approveProductStrategy(currentStrategy);
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const title = approvalType === "current_action" ? "Product action approved" : "Product strategy approved";
  const summary = approvalType === "current_action"
    ? `Approves product action "${actionId}" and advances the Workshop product workflow.`
    : "Approves the current product strategy fields as the active decision baseline.";

  const pkg = researchPackageSchema.parse({
    importVersion: "2.0",
    importId: `${slug}-${approvalType.replaceAll("_", "-")}-approved-${timestamp}`,
    version: "v1",
    marketSlug: slug,
    topic: "product",
    researchDate: new Date().toISOString().slice(0, 10),
    title,
    summary,
    executiveSummary: summary,
    recommendation: approvalType === "current_action" ? "Continue to next product action" : "Use approved product strategy as baseline",
    recommendationConfidence: 0.7,
    researcher: "Portal Action",
    reportMarkdown: `## Decision\n\n${summary}\n\nThis generated import is the audit trail and source of truth update.`,
    claims: [],
    sources: [],
    competitors: [],
    assumptions: [],
    risks: [],
    openQuestions: [],
    suggestedScoreChanges: [],
    reportUpdates: [],
    supportingEvidence: [],
    opposingEvidence: [],
    criticalUnknowns: [],
    killCriteria: [],
    whyWeWin: [],
    whyWeMayLose: [],
    nextResearchActions: [],
    coverageUpdates: [],
    decisionLogEntries: [],
    productStrategy: approvedStrategy,
  });

  const saved = await saveResearchImport(db, pkg);
  if (!saved.success) throw new Error(saved.errors.join("\n"));

  const researchImport = await db.researchImport.findUnique({
    where: { importId: saved.importId },
    include: { items: true },
  });
  const strategyItem = researchImport?.items.find((item) => item.itemType === "product_strategy");
  if (!strategyItem) throw new Error("Approval import was created without a product strategy item.");

  await reviewImportItem(db, strategyItem.id, "verified", "Approved from Market Detail.");
  revalidatePath(`/markets/${slug}`);
  revalidatePath("/research/inbox");
}
