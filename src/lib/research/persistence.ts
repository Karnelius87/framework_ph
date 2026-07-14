import { revalidatePath } from "next/cache";
import type { PrismaClient } from "@prisma/client";
import { DECISION_FORMULA_VERSION } from "@/config/decision";
import { calculateDecisionScore, criticalUnknownPenalty, decisionScoreExplanation, killCriteriaPenalty } from "@/lib/decision/calculations";
import { CURRENT_SCORING_FRAMEWORK_VERSION, calculateWeightedMarketScore, scoringCategories, scoringWeightSnapshot, weightedContribution } from "@/config/scoring";
import { domainFromUrl, getDuplicateWarnings, normalizeText, normalizeUrl } from "@/lib/research/duplicates";
import { decodeJson, encodeJson } from "@/lib/research/json";
import { productStrategySchema, researchPackageSchema, type ResearchPackage } from "@/lib/research/schema";
import { productStrategySnapshotData } from "@/lib/research/product-strategy";
import type { ProductStrategy } from "@/data/research";

export const LOCAL_REVIEWER = "Local Researcher";

export async function validatePackageForSave(db: PrismaClient, value: unknown) {
  const parsed = researchPackageSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
      warnings: [],
      duplicateWarnings: [],
    };
  }

  const pkg = parsed.data;
  const warnings: string[] = [];
  const ids = new Set<string>();

  for (const collection of [pkg.claims, pkg.sources, pkg.competitors, pkg.assumptions, pkg.risks, pkg.openQuestions, pkg.suggestedScoreChanges, pkg.reportUpdates, pkg.criticalUnknowns, pkg.killCriteria, pkg.whyWeWin, pkg.whyWeMayLose, pkg.nextResearchActions, pkg.coverageUpdates, pkg.decisionLogEntries]) {
    for (const item of collection) {
      const itemId = "id" in item && item.id ? item.id : "category" in item ? `coverage-${item.category}` : undefined;
      if (!itemId) continue;
      if (ids.has(itemId)) warnings.push(`ID "${itemId}" is reused inside this package.`);
      ids.add(itemId);
    }
  }

  const sourceIds = new Set(pkg.sources.map((source) => source.id));
  const claimIds = new Set(pkg.claims.map((claim) => claim.id));

  for (const claim of pkg.claims) {
    for (const sourceId of claim.sourceIds) {
      if (!sourceIds.has(sourceId)) warnings.push(`Claim "${claim.id}" links to missing source "${sourceId}".`);
    }
  }

  for (const change of pkg.suggestedScoreChanges) {
    for (const claimId of [...change.supportingClaimIds, ...change.opposingClaimIds]) {
      if (!claimIds.has(claimId)) warnings.push(`Score change "${change.id}" links to missing claim "${claimId}".`);
    }
    for (const sourceId of change.sourceIds) {
      if (!sourceIds.has(sourceId)) warnings.push(`Score change "${change.id}" links to missing source "${sourceId}".`);
    }
  }

  const duplicateWarnings = await getDuplicateWarnings(db, pkg);

  return {
    success: true as const,
    package: pkg,
    errors: [],
    warnings,
    duplicateWarnings,
  };
}

function itemPayloads(pkg: ResearchPackage) {
  return [
    ...pkg.claims.map((payload) => ({ itemType: "claim", externalId: payload.id, payload })),
    ...pkg.sources.map((payload) => ({ itemType: "source", externalId: payload.id, payload })),
    ...pkg.competitors.map((payload) => ({ itemType: "competitor", externalId: payload.id, payload })),
    ...pkg.assumptions.map((payload) => ({ itemType: "assumption", externalId: payload.id, payload })),
    ...pkg.risks.map((payload) => ({ itemType: "risk", externalId: payload.id, payload })),
    ...pkg.openQuestions.map((payload) => ({ itemType: "open_question", externalId: payload.id, payload })),
    ...pkg.suggestedScoreChanges.map((payload) => ({ itemType: "suggested_score_change", externalId: payload.id, payload })),
    ...pkg.criticalUnknowns.map((payload) => ({ itemType: "critical_unknown", externalId: payload.id, payload })),
    ...pkg.killCriteria.map((payload) => ({ itemType: "kill_criterion", externalId: payload.id, payload })),
    ...pkg.whyWeWin.map((payload) => ({ itemType: "why_we_win", externalId: payload.id, payload })),
    ...pkg.whyWeMayLose.map((payload) => ({ itemType: "why_we_may_lose", externalId: payload.id, payload })),
    ...pkg.nextResearchActions.map((payload) => ({ itemType: "research_action", externalId: payload.id, payload })),
    ...pkg.coverageUpdates.map((payload) => ({ itemType: "coverage_update", externalId: payload.id ?? payload.category, payload })),
    ...pkg.decisionLogEntries.map((payload) => ({ itemType: "decision_log", externalId: payload.id, payload })),
    ...pkg.reportUpdates.map((payload) => ({ itemType: "report_update", externalId: payload.id, payload })),
    ...(pkg.productStrategy ? [{ itemType: "product_strategy", externalId: `${pkg.marketSlug}-product-strategy`, payload: pkg.productStrategy }] : []),
  ];
}

export async function saveResearchImport(db: PrismaClient, value: unknown) {
  const validation = await validatePackageForSave(db, value);
  if (!validation.success) return validation;

  const pkg = validation.package;
  const market = await db.market.findUnique({ where: { slug: pkg.marketSlug } });
  const sequenceNumber = pkg.sequenceNumber ?? await nextSequenceNumber(db);
  const packageKey = pkg.importId;
  const packageVersion = pkg.version;

  const existing = await db.researchImport.findUnique({ where: { importId: `${packageKey}-${packageVersion}` } });
  if (existing) {
    return {
      success: false as const,
      errors: [`Research package "${packageKey} ${packageVersion}" already exists in the Research Inbox.`],
      warnings: validation.warnings,
      duplicateWarnings: validation.duplicateWarnings,
    };
  }

  const created = await db.researchImport.create({
    data: {
      importId: `${packageKey}-${packageVersion}`,
      importVersion: pkg.importVersion,
      sequenceNumber,
      packageKey,
      packageVersion,
      topic: pkg.topic,
      status: "pending_review",
      marketId: market?.id,
      marketSlug: pkg.marketSlug,
      researchDate: new Date(pkg.researchDate),
      title: pkg.title,
      summary: pkg.summary,
      executiveSummary: pkg.executiveSummary,
      recommendation: pkg.recommendation,
      recommendationConfidence: pkg.recommendationConfidence,
      researcher: pkg.researcher,
      reportMarkdown: pkg.reportMarkdown,
      validationWarnings: encodeJson(validation.warnings),
      duplicateWarnings: encodeJson(validation.duplicateWarnings),
      rawPackage: encodeJson(pkg),
      items: {
        create: itemPayloads(pkg).map((item) => ({
          itemType: item.itemType,
          externalId: item.externalId,
          payload: encodeJson(item.payload),
        })),
      },
    },
  });

  await db.researchPackageVersion.create({
    data: {
      researchImportId: created.id,
      marketId: market?.id,
      packageKey,
      sequenceNumber,
      version: packageVersion,
      topic: pkg.topic,
      status: "pending_review",
      title: pkg.title,
      researcher: pkg.researcher,
      researchDate: new Date(pkg.researchDate),
    },
  });

  if (market) {
    await db.timelineEvent.create({
      data: {
        marketId: market.id,
        type: "research_imported",
        title: "Research package imported",
        description: pkg.title,
        linkedEntityType: "ResearchImport",
        linkedEntityId: created.id,
      },
    });
  }

  safeRevalidatePath("/research/inbox");
  safeRevalidatePath(`/markets/${pkg.marketSlug}`);

  return {
    success: true as const,
    importId: created.importId,
    warnings: validation.warnings,
    duplicateWarnings: validation.duplicateWarnings,
    errors: [],
  };
}

export async function updateImportStatus(db: PrismaClient, researchImportId: string) {
  const items = await db.researchImportItem.findMany({ where: { researchImportId } });
  const reviewed = items.filter((item) => item.status !== "needs_review").length;
  const rejected = items.length > 0 && items.every((item) => item.status === "rejected");
  const approved = items.length > 0 && items.every((item) => ["verified", "incorporated"].includes(item.status));

  const importStatus = approved ? "approved" : rejected ? "rejected" : reviewed > 0 ? "partially_reviewed" : "pending_review";
  await db.researchImport.update({ where: { id: researchImportId }, data: { importStatus } });
}

export async function reviewImportItem(db: PrismaClient, itemId: string, status: string, reviewerNote?: string) {
  const item = await db.researchImportItem.update({
    where: { id: itemId },
    data: { status, reviewerNote, reviewedBy: LOCAL_REVIEWER, reviewedAt: new Date() },
    include: { researchImport: true },
  });

  if (["verified", "incorporated"].includes(status)) {
    await incorporateItem(db, item.id);
  }

  await updateImportStatus(db, item.researchImportId);
  safeRevalidatePath("/research/inbox");
  safeRevalidatePath(`/research/inbox/${item.researchImport.importId}`);
  safeRevalidatePath(`/markets/${item.researchImport.marketSlug}`);
}

export async function incorporateItem(db: PrismaClient, itemId: string) {
  const item = await db.researchImportItem.findUnique({
    where: { id: itemId },
    include: { researchImport: true },
  });
  if (!item) return;

  const market = await db.market.findUnique({ where: { slug: item.researchImport.marketSlug } });
  if (!market) return;

  const payload = decodeJson<Record<string, unknown>>(item.payload, {});

  if (item.itemType === "source") {
    const source = payload as {
      id: string; title: string; url: string; publisher: string; sourceType: string; publishedAt?: string | null; accessedAt: string; evidenceLevel: string; credibility: number; notes?: string;
    };
    await db.source.upsert({
      where: { externalId: source.id },
      create: {
        externalId: source.id,
        title: source.title,
        url: source.url,
        normalizedUrl: normalizeUrl(source.url),
        publisher: source.publisher,
        sourceType: source.sourceType,
        publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
        accessedAt: new Date(source.accessedAt),
        evidenceLevel: source.evidenceLevel,
        credibility: source.credibility,
        notes: source.notes,
        status: "verified",
        researchImportId: item.researchImportId,
        reviewedAt: new Date(),
      },
      update: { status: "verified", reviewedAt: new Date(), notes: source.notes },
    });
    await timeline(db, market.id, "source_verified", "Source verified", source.title, "Source", source.id);
  }

  if (item.itemType === "claim") {
    const claim = payload as {
      id: string; statement: string; category: string; direction: string; confidence: number; importance: string; status: string; scoreImpact?: number; sourceIds: string[]; competitorIds: string[]; notes?: string;
    };
    const category = await db.scoreCategory.findUnique({ where: { key: claim.category } });
    const created = await db.claim.upsert({
      where: { externalId: claim.id },
      create: {
        externalId: claim.id,
        statement: claim.statement,
        marketId: market.id,
        scoreCategoryId: category?.id,
        researchImportId: item.researchImportId,
        direction: claim.direction,
        confidence: claim.confidence,
        importance: claim.importance,
        status: "verified",
        scoreImpact: claim.scoreImpact,
        notes: claim.notes,
        reviewedAt: new Date(),
      },
      update: { status: "verified", reviewedAt: new Date(), notes: claim.notes },
    });

    for (const sourceId of claim.sourceIds) {
      const source = await db.source.findUnique({ where: { externalId: sourceId } });
      if (source) {
        await db.claimSource.upsert({
          where: { claimId_sourceId: { claimId: created.id, sourceId: source.id } },
          create: { claimId: created.id, sourceId: source.id, relationType: claim.direction === "opposing" ? "opposing" : "supporting", relevance: claim.confidence },
          update: { relationType: claim.direction === "opposing" ? "opposing" : "supporting", relevance: claim.confidence },
        });
      }
    }
    await timeline(db, market.id, "claim_approved", "Claim approved", claim.statement, "Claim", created.id);
  }

  if (item.itemType === "competitor") {
    const competitor = payload as {
      id: string; company: string; website: string; country: string; targetSegment: string; threatLevel: string; strengths: string[]; weaknesses: string[]; founded?: string; employees?: string; funding?: string; estimatedRevenue?: string; estimatedCustomers?: string; pricing?: string;
    };
    const domain = domainFromUrl(competitor.website || "");
    await db.competitor.upsert({
      where: { slug: slugify(competitor.company) },
      create: {
        externalId: competitor.id,
        slug: slugify(competitor.company),
        company: competitor.company,
        normalizedName: normalizeText(competitor.company),
        website: competitor.website,
        domain,
        country: competitor.country,
        founded: competitor.founded,
        employees: competitor.employees,
        funding: competitor.funding,
        estimatedRevenue: competitor.estimatedRevenue,
        estimatedCustomers: competitor.estimatedCustomers,
        pricing: competitor.pricing,
        targetSegment: competitor.targetSegment,
        strengths: encodeJson(competitor.strengths),
        weaknesses: encodeJson(competitor.weaknesses),
        threatLevel: competitor.threatLevel,
        marketId: market.id,
        researchImportId: item.researchImportId,
        status: "verified",
        reviewedAt: new Date(),
      },
      update: { status: "verified", reviewedAt: new Date(), marketId: market.id },
    });
    await timeline(db, market.id, "competitor_added", "Competitor added", competitor.company, "Competitor", competitor.id);
  }

  if (item.itemType === "assumption") {
    const assumption = payload as { id: string; statement: string; confidence?: number; notes?: string };
    await db.assumption.upsert({
      where: { id: `assumption-${item.id}` },
      create: { id: `assumption-${item.id}`, externalId: assumption.id, marketId: market.id, researchImportId: item.researchImportId, statement: assumption.statement, confidence: assumption.confidence, status: "verified", notes: assumption.notes, reviewedAt: new Date() },
      update: { status: "verified", reviewedAt: new Date(), notes: assumption.notes },
    });
    await timeline(db, market.id, "assumption_approved", "Assumption approved", assumption.statement, "Assumption", assumption.id);
  }

  if (item.itemType === "risk") {
    const risk = payload as { id: string; title: string; description: string; severity: string; notes?: string };
    await db.risk.upsert({
      where: { id: `risk-${item.id}` },
      create: { id: `risk-${item.id}`, externalId: risk.id, marketId: market.id, researchImportId: item.researchImportId, title: risk.title, description: risk.description, severity: risk.severity, status: "verified", notes: risk.notes, reviewedAt: new Date() },
      update: { status: "verified", reviewedAt: new Date(), notes: risk.notes },
    });
    await timeline(db, market.id, "risk_added", "Risk added", risk.title, "Risk", risk.id);
  }

  if (item.itemType === "open_question") {
    const question = payload as { id: string; question: string; priority: string; status?: string; notes?: string };
    await db.researchQuestion.upsert({
      where: { id: `question-${item.id}` },
      create: { id: `question-${item.id}`, externalId: question.id, marketId: market.id, researchImportId: item.researchImportId, question: question.question, priority: question.priority, status: question.status ?? "open", notes: question.notes, reviewedAt: new Date() },
      update: { status: question.status ?? "open", reviewedAt: new Date(), notes: question.notes },
    });
  }

  if (item.itemType === "report_update") {
    const update = payload as { id: string; chapter: string; title: string; content: string; claimIds: string[]; sourceIds: string[] };
    await db.reportUpdate.upsert({
      where: { externalId: update.id },
      create: { externalId: update.id, marketId: market.id, researchImportId: item.researchImportId, chapter: update.chapter, title: update.title, content: update.content, claimIds: encodeJson(update.claimIds), sourceIds: encodeJson(update.sourceIds), status: "incorporated", reviewedAt: new Date(), acceptedAt: new Date() },
      update: { status: "incorporated", reviewedAt: new Date(), acceptedAt: new Date() },
    });
    await timeline(db, market.id, "report_update_accepted", "Report update accepted", update.title, "ReportUpdate", update.id);
  }

  if (item.itemType === "critical_unknown") {
    const unknown = payload as { id: string; title: string; description: string; category: string; importance: string; currentConfidence: number; targetConfidence: number; status: string; owner?: string; dueDate?: string; validationMethod: string; impactIfWrong: string; recommendedAction?: string };
    const created = await db.criticalUnknown.create({
      data: {
        externalId: unknown.id,
        marketId: market.id,
        title: unknown.title,
        description: unknown.description,
        category: unknown.category,
        importance: unknown.importance,
        currentConfidence: unknown.currentConfidence,
        targetConfidence: unknown.targetConfidence,
        status: unknown.status,
        owner: unknown.owner,
        dueDate: unknown.dueDate ? new Date(unknown.dueDate) : null,
        validationMethod: unknown.validationMethod,
        impactIfWrong: unknown.impactIfWrong,
        recommendedAction: unknown.recommendedAction,
      },
    });
    await intelligenceRelation(db, market.id, "Market", market.slug, "CriticalUnknown", created.id, "has_unknown", "unverified", unknown.currentConfidence / 100);
    await recomputeDecisionMetric(db, market.id);
  }

  if (item.itemType === "kill_criterion") {
    const criterion = payload as { id: string; title: string; description: string; threshold: string; category: string; status: string; severity: string; evidenceStatus: string; reviewerNote?: string };
    const created = await db.killCriterion.create({
      data: {
        externalId: criterion.id,
        marketId: market.id,
        title: criterion.title,
        description: criterion.description,
        threshold: criterion.threshold,
        category: criterion.category,
        status: criterion.status,
        severity: criterion.severity,
        evidenceStatus: criterion.evidenceStatus,
        reviewerNote: criterion.reviewerNote,
        triggeredAt: criterion.status === "triggered" ? new Date() : null,
      },
    });
    await intelligenceRelation(db, market.id, "Market", market.slug, "KillCriterion", created.id, "has_kill_criterion", criterion.evidenceStatus, undefined);
    await recomputeDecisionMetric(db, market.id);
  }

  if (item.itemType === "why_we_win" || item.itemType === "why_we_may_lose") {
    const advantage = payload as { id: string; title: string; description: string; evidenceStatus: string; confidence: number; capabilityType: string; defensibility: string; timeHorizon: string };
    const data = {
      externalId: advantage.id,
      marketId: market.id,
      title: advantage.title,
      description: advantage.description,
      evidenceStatus: advantage.evidenceStatus,
      confidence: advantage.confidence,
      capabilityType: advantage.capabilityType,
      defensibility: advantage.defensibility,
      timeHorizon: advantage.timeHorizon,
    };
    const created = item.itemType === "why_we_win"
      ? await db.strategicAdvantage.create({ data })
      : await db.strategicDisadvantage.create({ data });
    await intelligenceRelation(db, market.id, "Market", market.slug, item.itemType === "why_we_win" ? "StrategicAdvantage" : "StrategicDisadvantage", created.id, item.itemType, advantage.evidenceStatus, advantage.confidence / 100);
  }

  if (item.itemType === "research_action") {
    const action = payload as { id: string; title: string; description: string; priority: string; reason: string; linkedCoverageCategory?: string; linkedUnknown?: string; linkedKillCriterion?: string; estimatedImpact: number; expectedConfidenceImprovement: number; status: string; dueDate?: string };
    await db.researchAction.create({
      data: {
        externalId: action.id,
        marketId: market.id,
        title: action.title,
        description: action.description,
        priority: action.priority,
        reason: action.reason,
        linkedCoverageCategory: action.linkedCoverageCategory,
        linkedUnknownId: action.linkedUnknown,
        linkedKillCriterionId: action.linkedKillCriterion,
        estimatedImpact: action.estimatedImpact,
        expectedConfidenceImprovement: action.expectedConfidenceImprovement,
        status: action.status,
        dueDate: action.dueDate ? new Date(action.dueDate) : null,
      },
    });
  }

  if (item.itemType === "coverage_update") {
    const coverage = payload as { category: string; score: number; targetScore: number; evidenceCount: number; verifiedEvidenceCount: number; confidence: number; gaps: string; recommendedNextAction: string; linkedClaims: string[]; linkedSources: string[]; linkedInterviews: string[] };
    await db.researchCoverage.upsert({
      where: { marketId_category: { marketId: market.id, category: coverage.category } },
      create: {
        marketId: market.id,
        category: coverage.category,
        label: titleCase(coverage.category),
        score: coverage.score,
        targetScore: coverage.targetScore,
        evidenceCount: coverage.evidenceCount,
        verifiedEvidenceCount: coverage.verifiedEvidenceCount,
        linkedClaimsCount: coverage.linkedClaims.length,
        linkedSourcesCount: coverage.linkedSources.length,
        linkedInterviewsCount: coverage.linkedInterviews.length,
        confidence: coverage.confidence,
        gaps: coverage.gaps,
        recommendedNextAction: coverage.recommendedNextAction,
        freshnessStatus: "current",
      },
      update: {
        score: coverage.score,
        targetScore: coverage.targetScore,
        evidenceCount: coverage.evidenceCount,
        verifiedEvidenceCount: coverage.verifiedEvidenceCount,
        linkedClaimsCount: coverage.linkedClaims.length,
        linkedSourcesCount: coverage.linkedSources.length,
        linkedInterviewsCount: coverage.linkedInterviews.length,
        confidence: coverage.confidence,
        gaps: coverage.gaps,
        recommendedNextAction: coverage.recommendedNextAction,
        freshnessStatus: "current",
      },
    });
    await recomputeDecisionMetric(db, market.id);
  }

  if (item.itemType === "decision_log") {
    const decision = payload as { id: string; title: string; decision: string; rationale: string; previousValue?: string; newValue?: string; decisionType: string; linkedClaims: string[]; linkedSources: string[]; linkedScoreChanges: string[]; linkedRisks: string[]; approvedBy: string; reversible: boolean; reviewDate?: string };
    await db.decisionLog.create({
      data: {
        externalId: decision.id,
        marketId: market.id,
        title: decision.title,
        decision: decision.decision,
        rationale: decision.rationale,
        previousValue: decision.previousValue,
        newValue: decision.newValue,
        decisionType: decision.decisionType,
        linkedClaims: encodeJson(decision.linkedClaims),
        linkedSources: encodeJson(decision.linkedSources),
        linkedScoreChanges: encodeJson(decision.linkedScoreChanges),
        linkedRisks: encodeJson(decision.linkedRisks),
        approvedBy: decision.approvedBy,
        reversible: decision.reversible,
        reviewDate: decision.reviewDate ? new Date(decision.reviewDate) : null,
      },
    });
  }

  if (item.itemType === "product_strategy") {
    const parsed = productStrategySchema.safeParse(payload);
    if (!parsed.success) return;

    const strategy = parsed.data as ProductStrategy;
    const data = productStrategySnapshotData({
      marketId: market.id,
      researchImportId: item.researchImportId,
      sourceImportItemId: item.id,
      strategy,
      approvedBy: LOCAL_REVIEWER,
    });

    await db.productStrategySnapshot.upsert({
      where: { marketId: market.id },
      create: data,
      update: data,
    });

    await timeline(db, market.id, "product_strategy_approved", "Product strategy approved", strategy.productName.value, "ProductStrategySnapshot", item.id);
  }
}

export async function approveScoreChange(db: PrismaClient, itemId: string, reviewerNote?: string) {
  const item = await db.researchImportItem.findUnique({
    where: { id: itemId },
    include: { researchImport: true },
  });
  if (!item || item.itemType !== "suggested_score_change") return;

  const market = await db.market.findUnique({ where: { slug: item.researchImport.marketSlug } });
  if (!market) return;

  const payload = decodeJson<{
    id: string; category: string; currentScore?: number; suggestedScore: number; reason: string; confidence: number; supportingClaimIds: string[]; opposingClaimIds: string[]; sourceIds: string[];
  }>(item.payload, { id: "", category: "", suggestedScore: 0, reason: "", confidence: 0, supportingClaimIds: [], opposingClaimIds: [], sourceIds: [] });
  const categoryConfig = scoringCategories.find((category) => category.key === payload.category);
  if (!categoryConfig) return;

  const category = await db.scoreCategory.findUnique({ where: { key: payload.category } });
  if (!category) return;

  const current = await db.marketScore.findUnique({ where: { marketId_scoreCategoryId: { marketId: market.id, scoreCategoryId: category.id } } });
  const previousScore = current?.score ?? payload.currentScore ?? 0;
  const newScore = payload.suggestedScore;

  const allScores = await db.marketScore.findMany({ where: { marketId: market.id }, include: { scoreCategory: true } });
  const totalBefore = totalScore(allScores.map((score) => ({ key: score.scoreCategory.key, score: score.score })));
  const totalAfter = totalScore(allScores.map((score) => ({ key: score.scoreCategory.key, score: score.scoreCategory.key === payload.category ? newScore : score.score })));

  await db.marketScore.upsert({
    where: { marketId_scoreCategoryId: { marketId: market.id, scoreCategoryId: category.id } },
    create: { marketId: market.id, scoreCategoryId: category.id, score: newScore, notes: payload.reason },
    update: { score: newScore, notes: payload.reason },
  });

  await db.scoreHistory.create({
    data: {
      marketId: market.id,
      scoreCategoryId: category.id,
      previousScore,
      newScore,
      previousWeightedContribution: weightedContribution(previousScore, categoryConfig.weight),
      newWeightedContribution: weightedContribution(newScore, categoryConfig.weight),
      totalScoreBefore: totalBefore,
      totalScoreAfter: totalAfter,
      frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
      weightSnapshot: encodeJson(scoringWeightSnapshot()),
      reason: payload.reason,
      linkedClaimIds: encodeJson([...payload.supportingClaimIds, ...payload.opposingClaimIds]),
      linkedSourceIds: encodeJson(payload.sourceIds),
      approvedBy: LOCAL_REVIEWER,
    },
  });

  await db.researchImportItem.update({
    where: { id: itemId },
    data: { status: "incorporated", reviewerNote, reviewedBy: LOCAL_REVIEWER, reviewedAt: new Date() },
  });

  await db.suggestedScoreChange.create({
    data: {
      externalId: payload.id,
      marketId: market.id,
      scoreCategoryId: category.id,
      researchImportId: item.researchImportId,
      currentScore: previousScore,
      suggestedScore: newScore,
      reason: payload.reason,
      confidence: payload.confidence,
      supportingClaimIds: encodeJson(payload.supportingClaimIds),
      opposingClaimIds: encodeJson(payload.opposingClaimIds),
      sourceIds: encodeJson(payload.sourceIds),
      status: "incorporated",
      reviewerNote,
      reviewedAt: new Date(),
    },
  });

  await timeline(db, market.id, "score_changed", "Score changed", `${categoryConfig.label}: ${previousScore} -> ${newScore}`, "SuggestedScoreChange", payload.id);
  await db.decisionLog.create({
    data: {
      externalId: `decision-${payload.id}`,
      marketId: market.id,
      title: "Score change approved",
      decision: `${categoryConfig.label}: ${previousScore} -> ${newScore}`,
      rationale: payload.reason,
      previousValue: String(previousScore),
      newValue: String(newScore),
      decisionType: "score_change",
      linkedClaims: encodeJson([...payload.supportingClaimIds, ...payload.opposingClaimIds]),
      linkedSources: encodeJson(payload.sourceIds),
      linkedScoreChanges: encodeJson([payload.id]),
      linkedRisks: encodeJson([]),
      approvedBy: LOCAL_REVIEWER,
      reversible: true,
    },
  });
  await recomputeDecisionMetric(db, market.id);
  await updateImportStatus(db, item.researchImportId);
  safeRevalidatePath(`/markets/${market.slug}`);
  safeRevalidatePath(`/research/inbox/${item.researchImport.importId}`);
}

function totalScore(scores: { key: string; score: number }[]) {
  return calculateWeightedMarketScore(scores);
}

function slugify(value: string) {
  return normalizeText(value).replace(/\s+/g, "-");
}

async function timeline(db: PrismaClient, marketId: string, type: string, title: string, description?: string, linkedEntityType?: string, linkedEntityId?: string) {
  await db.timelineEvent.create({
    data: {
      marketId,
      type,
      title,
      description,
      linkedEntityType,
      linkedEntityId,
    },
  });
}

async function nextSequenceNumber(db: PrismaClient) {
  const latest = await db.researchImport.findFirst({
    where: { sequenceNumber: { not: null } },
    orderBy: { sequenceNumber: "desc" },
  });
  return (latest?.sequenceNumber ?? 0) + 1;
}

async function intelligenceRelation(db: PrismaClient, marketId: string, fromType: string, fromId: string, toType: string, toId: string, relationType: string, evidenceStatus: string, confidence?: number) {
  await db.intelligenceRelation.create({
    data: { marketId, fromType, fromId, toType, toId, relationType, evidenceStatus, confidence },
  });
}

export async function recomputeDecisionMetric(db: PrismaClient, marketId: string) {
  const market = await db.market.findUnique({
    where: { id: marketId },
    include: {
      scores: { include: { scoreCategory: true } },
      researchCoverage: true,
      criticalUnknowns: true,
      killCriteria: true,
      founderFitMetric: true,
      executionReadinessMetric: true,
      leadershipMetric: true,
      decisionMetric: true,
    },
  });
  if (!market) return;

  const totalMarketScore = totalScore(market.scores.map((score) => ({ key: score.scoreCategory.key, score: score.score })));
  const coverageScore = market.researchCoverage.length
    ? Math.round(market.researchCoverage.reduce((sum, item) => sum + item.score, 0) / market.researchCoverage.length)
    : market.completeness;
  const coverageConfidence = market.researchCoverage.length
    ? Math.round(market.researchCoverage.reduce((sum, item) => sum + item.confidence, 0) / market.researchCoverage.length)
    : market.confidence;
  const customerValidation = market.researchCoverage.find((item) => item.category === "customer_validation")?.score ?? market.decisionMetric?.customerValidation ?? market.completeness;
  const competitorCoverage = market.researchCoverage.find((item) => item.category === "competition")?.score ?? market.decisionMetric?.competitorCoverage ?? market.completeness;
  const executionReadiness = market.executionReadinessMetric?.score ?? market.decisionMetric?.executionReadiness ?? market.completeness;
  const founderFit = market.founderFitMetric?.score ?? market.decisionMetric?.founderFit ?? market.confidence;
  const unknownPenalty = criticalUnknownPenalty(market.criticalUnknowns);
  const killPenalty = killCriteriaPenalty(market.killCriteria);
  const input = {
    totalMarketScore,
    researchConfidence: coverageConfidence,
    researchCompleteness: coverageScore,
    customerValidation,
    competitorCoverage,
    executionReadiness,
    founderFit,
    criticalUnknownPenalty: unknownPenalty,
    killCriteriaPenalty: killPenalty,
  };

  await db.decisionMetric.upsert({
    where: { marketId },
    create: {
      marketId,
      totalMarketScore,
      decisionScore: calculateDecisionScore(input),
      confidence: coverageConfidence,
      researchCompleteness: coverageScore,
      customerValidation,
      competitorCoverage,
      executionReadiness,
      founderFit,
      chanceOfBecomingNumberOne: market.leadershipMetric?.chance ?? market.chance,
      criticalUnknownPenalty: unknownPenalty,
      killCriteriaPenalty: killPenalty,
      formulaVersion: DECISION_FORMULA_VERSION,
      explanation: decisionScoreExplanation(input),
    },
    update: {
      totalMarketScore,
      decisionScore: calculateDecisionScore(input),
      confidence: coverageConfidence,
      researchCompleteness: coverageScore,
      customerValidation,
      competitorCoverage,
      executionReadiness,
      founderFit,
      chanceOfBecomingNumberOne: market.leadershipMetric?.chance ?? market.chance,
      criticalUnknownPenalty: unknownPenalty,
      killCriteriaPenalty: killPenalty,
      formulaVersion: DECISION_FORMULA_VERSION,
      explanation: decisionScoreExplanation(input),
    },
  });
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    if (error instanceof Error && error.message.includes("static generation store missing")) return;
    throw error;
  }
}
