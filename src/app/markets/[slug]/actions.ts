"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMarket } from "@/data/research";
import { getDb } from "@/lib/db";
import { approveMvpScope } from "@/lib/research/product-strategy-approvals";
import { productStrategyFromSnapshot } from "@/lib/research/product-strategy";
import { reviewImportItem, saveResearchImport } from "@/lib/research/persistence";
import { researchPackageSchema } from "@/lib/research/schema";

export async function approveMvpScopeAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  if (slug !== "workshop") throw new Error("MVP scope approval is currently only configured for Workshop.");

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

  const alreadyApproved = currentStrategy.productActions.some((action) => action.id === "approve-workshop-mvp-scope" && action.status === "completed");
  if (alreadyApproved) {
    redirect(`/markets/${slug}`);
  }

  const approvedStrategy = approveMvpScope(currentStrategy);
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const pkg = researchPackageSchema.parse({
    importVersion: "2.0",
    importId: `workshop-mvp-scope-approved-${timestamp}`,
    version: "v1",
    marketSlug: slug,
    topic: "product",
    researchDate: new Date().toISOString().slice(0, 10),
    title: "Workshop MVP scope approved",
    summary: "Approves the Workshop MVP scope and advances the current product action to building a pitchable demo.",
    executiveSummary: "The Workshop MVP scope is approved. The active source of truth now moves from MVP scope approval to demo build readiness.",
    recommendation: "Build pitchable Workshop demo",
    recommendationConfidence: 0.7,
    researcher: "Portal Action",
    reportMarkdown: "## Decision\n\nWorkshop MVP scope approved from the Market Detail action. This generated import is the audit trail and source of truth update.",
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

  await reviewImportItem(db, strategyItem.id, "verified", "Approved from Workshop Market Detail.");
  revalidatePath(`/markets/${slug}`);
  revalidatePath("/research/inbox");
  redirect(`/markets/${slug}`);
}
