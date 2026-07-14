import { getMarket } from "@/data/research";
import { getDb } from "@/lib/db";
import { reviewImportItem, saveResearchImport } from "@/lib/research/persistence";
import { researchPackageSchema } from "@/lib/research/schema";

async function main() {
  const db = getDb();
  const market = getMarket("workshop");
  if (!market?.productStrategy) throw new Error("Workshop product strategy is not available.");

  const pkg = researchPackageSchema.parse({
    importVersion: "2.0",
    importId: "workshop-product-strategy-source-of-truth-001",
    version: "v1",
    marketSlug: "workshop",
    topic: "product",
    researchDate: "2026-07-14",
    title: "Workshop product strategy source of truth",
    summary: "Moves the approved Workshop Garage Management Software strategy into the research import system so Market Detail reads product strategy from DB instead of static fallback data.",
    executiveSummary: "Workshop strategy source of truth: free Garage Management Software wedge first, then supplier and transaction economics only after workflow usage and demand data are validated.",
    recommendation: "Use imported product strategy as active Workshop source of truth",
    recommendationConfidence: 0.7,
    researcher: "Codex",
    reportMarkdown: "## Workshop product strategy source of truth\n\nThis package stores the Workshop product strategy through the same JSON import and review flow used by external research packages.",
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
    productStrategy: market.productStrategy,
  });

  const importId = `${pkg.importId}-${pkg.version}`;
  const saved = await saveResearchImport(db, pkg);
  if (!saved.success && !saved.errors.some((error) => error.includes("already exists"))) {
    throw new Error(saved.errors.join("\n"));
  }

  const researchImport = await db.researchImport.findUnique({
    where: { importId },
    include: { items: true },
  });
  if (!researchImport) throw new Error(`Could not find saved import ${importId}.`);

  const strategyItem = researchImport.items.find((item) => item.itemType === "product_strategy");
  if (!strategyItem) throw new Error(`Import ${importId} does not contain a product_strategy item.`);

  await reviewImportItem(db, strategyItem.id, "verified", "Accepted as Workshop product strategy source of truth.");

  console.log(`Workshop product strategy source of truth is active from import ${importId}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
