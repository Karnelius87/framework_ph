"use server";

import { revalidatePath } from "next/cache";
import { scoringCategories } from "@/config/scoring";
import { getDb } from "@/lib/db";

export async function exportAllResearchAction() {
  const db = getDb();
  return {
    exportedAt: new Date().toISOString(),
    markets: await db.market.findMany({ include: { scores: { include: { scoreCategory: true } } } }),
    scores: await db.marketScore.findMany({ include: { scoreCategory: true, market: true } }),
    claims: await db.claim.findMany({ include: { sources: true, competitors: true } }),
    sources: await db.source.findMany({ include: { claims: true } }),
    competitors: await db.competitor.findMany(),
    assumptions: await db.assumption.findMany(),
    risks: await db.risk.findMany(),
    questions: await db.researchQuestion.findMany(),
    reportUpdates: await db.reportUpdate.findMany(),
    scoreHistory: await db.scoreHistory.findMany(),
    timelineEvents: await db.timelineEvent.findMany(),
    researchImports: await db.researchImport.findMany({ include: { items: true } }),
  };
}

export async function exportMarketAction(slug: string) {
  const market = await getDb().market.findUnique({
    where: { slug },
    include: {
      scores: { include: { scoreCategory: true } },
      claims: { include: { sources: true, competitors: true, scoreCategory: true } },
      competitors: true,
      assumptions: true,
      risks: true,
      questions: true,
      reportUpdates: true,
      scoreHistory: true,
      timelineEvents: true,
    },
  });
  return { exportedAt: new Date().toISOString(), market };
}

export async function exportSourcesAction() {
  return { exportedAt: new Date().toISOString(), sources: await getDb().source.findMany({ include: { claims: true } }) };
}

export async function exportClaimsAction() {
  return { exportedAt: new Date().toISOString(), claims: await getDb().claim.findMany({ include: { sources: true, competitors: true, scoreCategory: true } }) };
}

export async function exportBackupAction() {
  return exportAllResearchAction();
}

export async function resetLocalDatabaseAction() {
  const db = getDb();
  await db.claimSource.deleteMany();
  await db.claimCompetitor.deleteMany();
  await db.scoreHistory.deleteMany();
  await db.suggestedScoreChange.deleteMany();
  await db.reportUpdate.deleteMany();
  await db.researchQuestion.deleteMany();
  await db.risk.deleteMany();
  await db.assumption.deleteMany();
  await db.competitor.deleteMany();
  await db.source.deleteMany();
  await db.claim.deleteMany();
  await db.researchImportItem.deleteMany();
  await db.researchImport.deleteMany();
  await db.timelineEvent.deleteMany();
  await db.marketScore.deleteMany();
  await db.scoreCategory.deleteMany();
  await db.market.deleteMany();
  revalidatePath("/");
  return { ok: true };
}

export async function clearDemoDataAction() {
  const db = getDb();
  const demoSlugs = ["workshop", "beauty", "veterinary", "construction", "laundry", "lpg"];
  const markets = await db.market.findMany({ where: { slug: { in: demoSlugs } } });
  await db.market.deleteMany({ where: { id: { in: markets.map((market) => market.id) } } });
  await db.scoreCategory.deleteMany({ where: { key: { in: scoringCategories.map((category) => category.key) } } });
  revalidatePath("/");
  return { ok: true };
}

export async function importBackupAction(_backup: unknown) {
  return {
    ok: false,
    message: "Backup import is intentionally staged: export works now, but restore requires a reviewed mapping step to avoid overwriting local research accidentally.",
  };
}
