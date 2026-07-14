/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb } from "@/lib/db";
import { scoringCategories } from "@/config/scoring";
import { graphNodeTypes, type GraphEdge, type GraphEdgeType, type GraphLayout, type GraphNode, type GraphNodeType, type GraphPayload, type GraphQuality } from "@/lib/intelligence/types";
export { graphNodeTypes, graphEdgeTypes, type GraphEdge, type GraphEdgeType, type GraphLayout, type GraphNode, type GraphNodeType, type GraphPayload, type GraphQuality } from "@/lib/intelligence/types";

export type GraphBuildOptions = {
  mode?: "default" | "decision" | "source-impact";
  focusNodeId?: string;
  includeSources?: boolean;
  limit?: number;
  layout?: GraphLayout;
};

export function graphNodeId(type: GraphNodeType, id: string) {
  return `${type}:${id}`;
}

export function parseGraphNodeId(nodeId: string): { type: GraphNodeType; id: string } | null {
  const separator = nodeId.indexOf(":");
  if (separator === -1) return null;
  const type = nodeId.slice(0, separator) as GraphNodeType;
  if (!graphNodeTypes.includes(type)) return null;
  return { type, id: nodeId.slice(separator + 1) };
}

export function mergeGraphPayloads(...payloads: GraphPayload[]): GraphPayload {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const warnings = new Set<string>();
  for (const payload of payloads) {
    payload.nodes.forEach((node) => nodes.set(node.id, { ...nodes.get(node.id), ...node }));
    payload.edges.forEach((edge) => edges.set(edge.id, edge));
    payload.warnings.forEach((warning) => warnings.add(warning));
  }
  const mergedNodes = [...nodes.values()];
  const mergedEdges = [...edges.values()];
  return {
    nodes: mergedNodes,
    edges: mergedEdges,
    quality: buildQualitySummary(mergedNodes, mergedEdges),
    rootNodeId: payloads[0]?.rootNodeId,
    focusedNodeId: payloads.at(-1)?.focusedNodeId ?? payloads[0]?.focusedNodeId,
    layout: payloads.at(-1)?.layout ?? "hierarchical",
    warnings: [...warnings],
  };
}

export function buildQualitySummary(nodes: GraphNode[], edges: GraphEdge[]): GraphQuality {
  const connectedSourceIds = new Set(edges.map((edge) => edge.source).concat(edges.map((edge) => edge.target)));
  const claims = nodes.filter((node) => node.type === "claim");
  const sources = nodes.filter((node) => node.type === "source" || node.type === "interview");
  const competitors = nodes.filter((node) => node.type === "competitor");
  const risks = nodes.filter((node) => node.type === "risk");
  const decisions = nodes.filter((node) => node.type === "decision");
  const scoreChanges = nodes.filter((node) => node.type === "score_change");
  const reportUpdates = nodes.filter((node) => node.type === "report_update");
  const unknowns = nodes.filter((node) => node.type === "critical_unknown");

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    verifiedClaims: claims.filter((node) => ["verified", "incorporated"].includes(node.status ?? "")).length,
    unresolvedClaims: claims.filter((node) => !["verified", "incorporated", "rejected"].includes(node.status ?? "")).length,
    orphanedClaims: claims.filter((node) => !connectedSourceIds.has(node.id)).length,
    sourcesWithoutClaims: sources.filter((node) => !connectedSourceIds.has(node.id)).length,
    claimsWithoutSources: claims.filter((node) => Number(node.evidenceCount ?? 0) === 0).length,
    staleSources: sources.filter((node) => ["stale", "aging", "unknown"].includes(node.freshness ?? "")).length,
    weakEvidenceCategories: nodes.filter((node) => node.type === "score_category" && Number(node.evidenceCount ?? 0) < 2).length,
    disconnectedCompetitors: competitors.filter((node) => !connectedSourceIds.has(node.id)).length,
    risksWithoutEvidence: risks.filter((node) => !connectedSourceIds.has(node.id)).length,
    decisionsWithoutRationale: decisions.filter((node) => !node.summary).length,
    scoreChangesWithoutClaims: scoreChanges.filter((node) => !connectedSourceIds.has(node.id)).length,
    reportUpdatesWithoutEvidence: reportUpdates.filter((node) => !connectedSourceIds.has(node.id)).length,
    unknownsWithoutValidationActions: unknowns.filter((node) => !edges.some((edge) => edge.source === node.id && edge.type === "addresses")).length,
  };
}

export function addGraphEdge(edges: Map<string, GraphEdge>, edge: Omit<GraphEdge, "id">) {
  if (edge.source === edge.target) return;
  const id = `${edge.source}->${edge.target}:${edge.type}:${edge.label}`;
  if (!edges.has(id)) edges.set(id, { id, ...edge });
}

export async function buildInitialMarketGraph(slug: string, options: GraphBuildOptions = {}): Promise<GraphPayload> {
  const db = getDb();
  const market = await db.market.findUnique({
    where: { slug },
    include: {
      scores: { include: { scoreCategory: true } },
      decisionMetric: true,
      claims: {
        include: {
          scoreCategory: true,
          sources: { include: { source: true } },
          competitors: { include: { competitor: true } },
        },
        orderBy: [{ importance: "desc" }, { confidence: "desc" }, { createdAt: "desc" }],
      },
      competitors: { include: { claims: true }, orderBy: { company: "asc" } },
      assumptions: { orderBy: { createdAt: "desc" } },
      risks: { orderBy: { createdAt: "desc" } },
      criticalUnknowns: { orderBy: [{ importance: "desc" }, { currentConfidence: "asc" }] },
      killCriteria: { orderBy: [{ status: "desc" }, { severity: "desc" }] },
      researchActions: { orderBy: [{ priority: "desc" }, { estimatedImpact: "desc" }] },
      decisionLogs: { orderBy: { approvedAt: "desc" } },
      reportUpdates: { orderBy: { createdAt: "desc" } },
      scoreHistory: { include: { scoreCategory: true }, orderBy: { approvedAt: "desc" } },
      packageVersions: { orderBy: { createdAt: "desc" } },
      imports: { orderBy: { importedAt: "desc" } },
      intelligenceRelations: true,
    },
  });

  if (!market) {
    return emptyPayload(options.layout ?? "hierarchical", [`Market not found: ${slug}`]);
  }

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const warnings: string[] = [];
  const rootNodeId = graphNodeId("market", market.id);
  const includeSources = options.includeSources || options.mode === "source-impact";
  const claimLimit = options.limit ?? 8;

  nodes.set(rootNodeId, {
    id: rootNodeId,
    type: "market",
    label: market.name,
    status: market.stage,
    confidence: market.confidence,
    evidenceCount: market.claims.length,
    lastUpdated: market.updatedAt.toISOString(),
    freshness: market.freshnessStatus,
    summary: market.recommendation,
    href: `/markets/${market.slug}`,
    detail: {
      slug: market.slug,
      score: market.score,
      completeness: market.completeness,
      chance: market.chance,
      recommendation: market.recommendation,
    },
  });

  const decisionNodeId = graphNodeId("decision", `metric-${market.id}`);
  if (market.decisionMetric) {
    nodes.set(decisionNodeId, {
      id: decisionNodeId,
      type: "decision",
      label: "Decision Score",
      status: market.recommendation,
      confidence: market.decisionMetric.confidence,
      lastUpdated: market.decisionMetric.updatedAt.toISOString(),
      summary: market.decisionMetric.explanation,
      href: `/markets/${market.slug}/metrics`,
      detail: {
        decisionScore: Math.round(market.decisionMetric.decisionScore),
        totalMarketScore: Math.round(market.decisionMetric.totalMarketScore),
        criticalUnknownPenalty: market.decisionMetric.criticalUnknownPenalty,
        killCriteriaPenalty: market.decisionMetric.killCriteriaPenalty,
      },
    });
    addGraphEdge(edges, { source: rootNodeId, target: decisionNodeId, type: "affects_score", label: "drives recommendation", tone: "neutral", confidence: market.decisionMetric.confidence / 100 });
  }

  const scoreByKey = new Map(market.scores.map((score) => [score.scoreCategory.key, score]));
  for (const category of scoringCategories) {
    const score = scoreByKey.get(category.key);
    const categoryClaims = market.claims.filter((claim) => claim.scoreCategory?.key === category.key);
    const id = graphNodeId("score_category", category.key);
    nodes.set(id, {
      id,
      type: "score_category",
      label: category.label,
      status: "score-impacting",
      confidence: score ? 100 : undefined,
      evidenceCount: categoryClaims.length,
      lastUpdated: score?.updatedAt.toISOString(),
      freshness: score?.freshnessStatus,
      summary: `${Math.round(score?.score ?? 0)} score x ${category.weight}% weight`,
      href: `/markets/${market.slug}/metrics?category=${category.key}`,
      detail: {
        key: category.key,
        score: Math.round(score?.score ?? 0),
        weight: category.weight,
        weightedContribution: Math.round(((score?.score ?? 0) * category.weight) / 100),
      },
    });
    addGraphEdge(edges, { source: rootNodeId, target: id, type: "affects_score", label: "score category", tone: "neutral", confidence: 1 });
    if (market.decisionMetric) addGraphEdge(edges, { source: id, target: decisionNodeId, type: "affects_score", label: "feeds Decision Score", tone: "neutral", confidence: 1 });
  }

  const supportingClaims = market.claims.filter((claim) => claim.direction !== "opposing").slice(0, claimLimit);
  const opposingClaims = market.claims.filter((claim) => claim.direction === "opposing").slice(0, claimLimit);
  for (const claim of [...supportingClaims, ...opposingClaims]) addClaimNode(nodes, edges, claim, { includeSources });

  for (const competitor of market.competitors.slice(0, 8)) {
    const id = graphNodeId("competitor", competitor.id);
    nodes.set(id, {
      id,
      type: "competitor",
      label: competitor.company,
      status: competitor.threatLevel,
      evidenceCount: competitor.claims.length,
      lastUpdated: (competitor.lastVerifiedAt ?? competitor.createdAt).toISOString(),
      freshness: competitor.freshnessStatus,
      summary: competitor.targetSegment,
      href: `/competitors/${competitor.slug}`,
      detail: {
        country: competitor.country,
        pricing: competitor.pricing,
        targetSegment: competitor.targetSegment,
        threatLevel: competitor.threatLevel,
        strengths: splitList(competitor.strengths),
        weaknesses: splitList(competitor.weaknesses),
      },
    });
    addGraphEdge(edges, { source: rootNodeId, target: id, type: "linked_to_competitor", label: "market competitor", tone: "neutral" });
  }

  for (const unknown of market.criticalUnknowns.filter((item) => item.importance === "critical" || item.status !== "validated").slice(0, 8)) {
    const id = graphNodeId("critical_unknown", unknown.id);
    nodes.set(id, {
      id,
      type: "critical_unknown",
      label: unknown.title,
      status: unknown.status,
      confidence: unknown.currentConfidence,
      importance: unknown.importance,
      lastUpdated: unknown.updatedAt.toISOString(),
      summary: unknown.impactIfWrong,
      detail: {
        category: unknown.category,
        validationMethod: unknown.validationMethod,
        recommendedAction: unknown.recommendedAction,
        targetConfidence: unknown.targetConfidence,
      },
    });
    addGraphEdge(edges, { source: id, target: decisionNodeId, type: "blocks", label: "penalizes Decision Score", tone: "unresolved", confidence: unknown.currentConfidence / 100 });
    addGraphEdge(edges, { source: rootNodeId, target: id, type: "relates_to", label: "open unknown", tone: "unresolved" });
  }

  for (const criterion of market.killCriteria.filter((item) => ["triggered", "warning", "monitoring"].includes(item.status)).slice(0, 6)) {
    const id = graphNodeId("kill_criterion", criterion.id);
    nodes.set(id, {
      id,
      type: "kill_criterion",
      label: criterion.title,
      status: criterion.status,
      importance: criterion.severity,
      lastUpdated: criterion.updatedAt.toISOString(),
      freshness: criterion.evidenceStatus,
      summary: criterion.threshold,
      detail: {
        category: criterion.category,
        description: criterion.description,
        reviewerNote: criterion.reviewerNote,
      },
    });
    addGraphEdge(edges, { source: id, target: decisionNodeId, type: "triggered_by", label: "kill criterion effect", tone: criterion.status === "warning" ? "unresolved" : "opposing" });
  }

  for (const risk of market.risks.slice(0, 6)) addRiskNode(nodes, edges, risk, rootNodeId);
  for (const assumption of market.assumptions.slice(0, 6)) addAssumptionNode(nodes, edges, assumption, rootNodeId);
  for (const action of market.researchActions.slice(0, 8)) addResearchActionNode(nodes, edges, action);
  for (const decision of market.decisionLogs.slice(0, 6)) addDecisionLogNode(nodes, edges, decision, rootNodeId);
  for (const update of market.reportUpdates.slice(0, 4)) addReportUpdateNode(nodes, edges, update, rootNodeId);
  for (const scoreChange of market.scoreHistory.slice(0, 6)) addScoreChangeNode(nodes, edges, scoreChange);
  for (const pkg of market.packageVersions.slice(0, 3)) addResearchPackageNode(nodes, edges, pkg, rootNodeId);

  for (const relation of market.intelligenceRelations) {
    const source = relationId(relation.fromType, relation.fromId, market.id);
    const target = relationId(relation.toType, relation.toId, market.id);
    if (nodes.has(source) && nodes.has(target)) {
      addGraphEdge(edges, {
        source,
        target,
        type: normalizeRelationType(relation.relationType),
        label: humanize(relation.relationType),
        tone: relationTone(relation.relationType, relation.evidenceStatus),
        confidence: relation.confidence ?? undefined,
      });
    }
  }

  connectActionsToUnknowns([...nodes.values()], edges, market.researchActions);

  const graphNodes = [...nodes.values()];
  const graphEdges = [...edges.values()];
  if (graphNodes.length > 160) warnings.push("Initial graph was capped to keep first render readable. Use expansion for more records.");

  return {
    nodes: graphNodes,
    edges: graphEdges,
    quality: buildQualitySummary(graphNodes, graphEdges),
    rootNodeId,
    focusedNodeId: options.focusNodeId ?? (options.mode === "decision" ? decisionNodeId : rootNodeId),
    layout: options.layout ?? (options.mode === "decision" ? "decision" : "hierarchical"),
    warnings,
  };
}

export async function expandGraphNode(marketSlug: string, nodeId: string, limit = 25): Promise<GraphPayload> {
  const parsed = parseGraphNodeId(nodeId);
  if (!parsed) return emptyPayload("hierarchical", ["Invalid graph node id."]);

  const db = getDb();
  const market = await db.market.findUnique({ where: { slug: marketSlug } });
  if (!market) return emptyPayload("hierarchical", [`Market not found: ${marketSlug}`]);

  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const warnings: string[] = [];

  if (parsed.type === "claim") {
    const claim = await db.claim.findUnique({
      where: { id: parsed.id },
      include: { scoreCategory: true, sources: { include: { source: true } }, competitors: { include: { competitor: true } }, market: true },
    });
    if (claim) addClaimNode(nodes, edges, claim, { includeSources: true });
  }

  if (parsed.type === "source" || parsed.type === "interview") {
    const source = await db.source.findUnique({ where: { id: parsed.id }, include: { claims: { include: { claim: { include: { scoreCategory: true } } } } } });
    if (source) {
      const sourceId = addSourceNode(nodes, source);
      for (const link of source.claims.slice(0, limit)) {
        addClaimNode(nodes, edges, { ...link.claim, sources: [], competitors: [] }, { includeSources: false });
        addGraphEdge(edges, {
          source: sourceId,
          target: graphNodeId("claim", link.claimId),
          type: link.relationType === "opposes" ? "opposes" : "supports",
          label: link.relationType,
          tone: link.relationType === "opposes" ? "opposing" : "supporting",
          confidence: link.relevance ?? undefined,
        });
      }
    }
  }

  if (parsed.type === "competitor") {
    const competitor = await db.competitor.findUnique({ where: { id: parsed.id }, include: { claims: { include: { claim: { include: { scoreCategory: true, sources: { include: { source: true } } } } } } } });
    if (competitor) {
      const competitorId = graphNodeId("competitor", competitor.id);
      nodes.set(competitorId, {
        id: competitorId,
        type: "competitor",
        label: competitor.company,
        status: competitor.threatLevel,
        evidenceCount: competitor.claims.length,
        lastUpdated: (competitor.lastVerifiedAt ?? competitor.createdAt).toISOString(),
        freshness: competitor.freshnessStatus,
        summary: competitor.targetSegment,
        href: `/competitors/${competitor.slug}`,
        detail: { country: competitor.country, pricing: competitor.pricing, targetSegment: competitor.targetSegment, threatLevel: competitor.threatLevel },
      });
      for (const link of competitor.claims.slice(0, limit)) {
        addClaimNode(nodes, edges, link.claim, { includeSources: true });
        addGraphEdge(edges, { source: graphNodeId("claim", link.claimId), target: competitorId, type: "linked_to_competitor", label: link.relationType ?? "linked competitor", tone: "neutral" });
      }
    }
  }

  if (parsed.type === "critical_unknown") {
    const actions = await db.researchAction.findMany({ where: { marketId: market.id, linkedUnknownId: parsed.id }, take: limit });
    const unknownId = graphNodeId("critical_unknown", parsed.id);
    for (const action of actions) {
      addResearchActionNode(nodes, edges, action);
      addGraphEdge(edges, { source: unknownId, target: graphNodeId("research_action", action.id), type: "addresses", label: "validation action", tone: "unresolved", confidence: action.expectedConfidenceImprovement / 100 });
    }
  }

  if (parsed.type === "kill_criterion") {
    const actions = await db.researchAction.findMany({ where: { marketId: market.id, linkedKillCriterionId: parsed.id }, take: limit });
    const criterionId = graphNodeId("kill_criterion", parsed.id);
    for (const action of actions) {
      addResearchActionNode(nodes, edges, action);
      addGraphEdge(edges, { source: criterionId, target: graphNodeId("research_action", action.id), type: "mitigates", label: "mitigation action", tone: "unresolved" });
    }
  }

  if (parsed.type === "research_package") {
    const pkg = await db.researchPackageVersion.findUnique({ where: { id: parsed.id }, include: { researchImport: { include: { claims: true, sources: true, suggestedScoreChanges: true, reportUpdates: true } } } });
    const pkgId = graphNodeId("research_package", parsed.id);
    if (pkg?.researchImport) {
      for (const claim of pkg.researchImport.claims.slice(0, limit)) {
        addClaimNode(nodes, edges, { ...claim, scoreCategory: null, sources: [], competitors: [] }, { includeSources: false });
        addGraphEdge(edges, { source: pkgId, target: graphNodeId("claim", claim.id), type: "included_in", label: "imported claim", tone: "neutral" });
      }
      for (const source of pkg.researchImport.sources.slice(0, limit)) {
        const sourceId = addSourceNode(nodes, source);
        addGraphEdge(edges, { source: pkgId, target: sourceId, type: "included_in", label: "imported source", tone: "neutral" });
      }
    }
  }

  const graphNodes = [...nodes.values()];
  const graphEdges = [...edges.values()];
  if (graphNodes.length >= limit) warnings.push(`Expansion capped at ${limit} connected records.`);
  return {
    nodes: graphNodes,
    edges: graphEdges,
    quality: buildQualitySummary(graphNodes, graphEdges),
    focusedNodeId: nodeId,
    layout: "hierarchical",
    warnings,
  };
}

export async function searchGraphRecords(marketSlug: string | undefined, query: string, limit = 20) {
  const db = getDb();
  const trimmed = query.trim();
  if (!trimmed) return [];
  const market = marketSlug ? await db.market.findUnique({ where: { slug: marketSlug } }) : null;
  const marketWhere = market ? { marketId: market.id } : {};
  const contains = { contains: trimmed };

  const [claims, sources, competitors, risks, unknowns, decisions, assumptions] = await Promise.all([
    db.claim.findMany({ where: { ...marketWhere, OR: [{ statement: contains }, { externalId: contains }] }, take: limit }),
    db.source.findMany({ where: { OR: [{ title: contains }, { publisher: contains }] }, take: limit }),
    db.competitor.findMany({ where: { ...(market ? { marketId: market.id } : {}), OR: [{ company: contains }, { targetSegment: contains }] }, take: limit }),
    db.risk.findMany({ where: { ...marketWhere, OR: [{ title: contains }, { description: contains }] }, take: limit }),
    db.criticalUnknown.findMany({ where: { ...marketWhere, OR: [{ title: contains }, { description: contains }] }, take: limit }),
    db.decisionLog.findMany({ where: { ...marketWhere, OR: [{ title: contains }, { decision: contains }, { rationale: contains }] }, take: limit }),
    db.assumption.findMany({ where: { ...marketWhere, statement: contains }, take: limit }),
  ]);

  return [
    ...claims.map((item) => ({ nodeId: graphNodeId("claim", item.id), type: "claim", label: item.externalId, summary: item.statement })),
    ...sources.map((item) => ({ nodeId: graphNodeId(item.evidenceLevel.toLowerCase().includes("interview") ? "interview" : "source", item.id), type: "source", label: item.title, summary: item.publisher })),
    ...competitors.map((item) => ({ nodeId: graphNodeId("competitor", item.id), type: "competitor", label: item.company, summary: item.targetSegment })),
    ...risks.map((item) => ({ nodeId: graphNodeId("risk", item.id), type: "risk", label: item.title, summary: item.description })),
    ...unknowns.map((item) => ({ nodeId: graphNodeId("critical_unknown", item.id), type: "critical_unknown", label: item.title, summary: item.impactIfWrong })),
    ...decisions.map((item) => ({ nodeId: graphNodeId("decision", item.id), type: "decision", label: item.title, summary: item.decision })),
    ...assumptions.map((item) => ({ nodeId: graphNodeId("assumption", item.id), type: "assumption", label: item.externalId, summary: item.statement })),
  ].slice(0, limit);
}

export async function buildDecisionTrace(marketSlug: string): Promise<GraphPayload> {
  return buildInitialMarketGraph(marketSlug, { mode: "decision", includeSources: true, limit: 10, layout: "decision" });
}

export async function buildSourceImpactTrace(marketSlug: string, sourceNodeId?: string): Promise<GraphPayload> {
  const initial = await buildInitialMarketGraph(marketSlug, { mode: "source-impact", includeSources: true, limit: 10, layout: "evidence" });
  if (!sourceNodeId) return initial;
  const expanded = await expandGraphNode(marketSlug, sourceNodeId, 25);
  return mergeGraphPayloads(initial, expanded);
}

function emptyPayload(layout: GraphLayout, warnings: string[]): GraphPayload {
  return { nodes: [], edges: [], quality: buildQualitySummary([], []), layout, warnings };
}

function addClaimNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, claim: any, options: { includeSources: boolean }) {
  const id = graphNodeId("claim", claim.id);
  nodes.set(id, {
    id,
    type: "claim",
    label: claim.externalId,
    status: claim.status,
    confidence: Math.round(Number(claim.confidence ?? 0) * 100),
    evidenceCount: claim.sources?.length ?? 0,
    importance: claim.importance,
    freshness: claim.freshnessStatus,
    lastUpdated: (claim.lastVerifiedAt ?? claim.createdAt)?.toISOString(),
    summary: claim.statement,
    demo: /Demo \/ Hypothesis/i.test(claim.statement) || /Demo \/ Hypothesis/i.test(claim.notes ?? ""),
    detail: {
      statement: claim.statement,
      category: claim.scoreCategory?.label ?? "Uncategorized",
      direction: claim.direction,
      scoreImpact: claim.scoreImpact,
      notes: claim.notes,
    },
  });
  if (claim.scoreCategory?.key) {
    addGraphEdge(edges, {
      source: id,
      target: graphNodeId("score_category", claim.scoreCategory.key),
      type: "affects_score",
      label: claim.direction === "opposing" ? "opposes score" : "supports score",
      tone: claim.direction === "opposing" ? "opposing" : "supporting",
      confidence: claim.confidence,
    });
  }
  for (const link of claim.competitors ?? []) {
    if (link.competitor) {
      const competitorId = graphNodeId("competitor", link.competitor.id);
      nodes.set(competitorId, {
        id: competitorId,
        type: "competitor",
        label: link.competitor.company,
        status: link.competitor.threatLevel,
        evidenceCount: 1,
        lastUpdated: (link.competitor.lastVerifiedAt ?? link.competitor.createdAt).toISOString(),
        freshness: link.competitor.freshnessStatus,
        summary: link.competitor.targetSegment,
        href: `/competitors/${link.competitor.slug}`,
      });
      addGraphEdge(edges, { source: id, target: competitorId, type: "linked_to_competitor", label: link.relationType ?? "competitor evidence", tone: "neutral" });
    }
  }
  if (options.includeSources) {
    for (const link of claim.sources ?? []) {
      if (!link.source) continue;
      const sourceId = addSourceNode(nodes, link.source);
      addGraphEdge(edges, {
        source: sourceId,
        target: id,
        type: link.relationType === "opposes" ? "opposes" : "supports",
        label: link.relationType,
        tone: link.relationType === "opposes" ? "opposing" : "supporting",
        confidence: link.relevance ?? undefined,
      });
    }
  }
}

function addSourceNode(nodes: Map<string, GraphNode>, source: any) {
  const type = String(source.evidenceLevel ?? "").toLowerCase().includes("interview") ? "interview" : "source";
  const id = graphNodeId(type, source.id);
  nodes.set(id, {
    id,
    type,
    label: source.title,
    status: source.status,
    confidence: Math.round(Number(source.credibility ?? 0) * 100),
    evidenceCount: undefined,
    freshness: source.freshnessStatus,
    lastUpdated: (source.lastVerifiedAt ?? source.accessedAt ?? source.createdAt).toISOString(),
    summary: source.publisher,
    href: source.url,
    detail: {
      publisher: source.publisher,
      sourceType: source.sourceType,
      evidenceLevel: source.evidenceLevel,
      credibility: source.credibility,
      accessedAt: source.accessedAt?.toISOString(),
      url: source.url,
    },
  });
  return id;
}

function addRiskNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, risk: any, marketId: string) {
  const id = graphNodeId("risk", risk.id);
  nodes.set(id, { id, type: "risk", label: risk.title, status: risk.status, importance: risk.severity, lastUpdated: (risk.reviewedAt ?? risk.createdAt).toISOString(), summary: risk.description });
  addGraphEdge(edges, { source: marketId, target: id, type: "relates_to", label: "risk", tone: "opposing" });
}

function addAssumptionNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, assumption: any, marketId: string) {
  const id = graphNodeId("assumption", assumption.id);
  nodes.set(id, { id, type: "assumption", label: assumption.externalId, status: assumption.status, confidence: assumption.confidence ? Math.round(assumption.confidence * 100) : undefined, lastUpdated: (assumption.reviewedAt ?? assumption.createdAt).toISOString(), summary: assumption.statement });
  addGraphEdge(edges, { source: marketId, target: id, type: "relates_to", label: "assumption", tone: "unresolved" });
}

function addResearchActionNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, action: any) {
  const id = graphNodeId("research_action", action.id);
  nodes.set(id, {
    id,
    type: "research_action",
    label: action.title,
    status: action.status,
    importance: action.priority,
    confidence: action.expectedConfidenceImprovement,
    lastUpdated: action.updatedAt.toISOString(),
    summary: action.description,
    href: "/research/actions",
    detail: { reason: action.reason, estimatedImpact: action.estimatedImpact, expectedConfidenceImprovement: action.expectedConfidenceImprovement },
  });
  if (action.linkedUnknownId) addGraphEdge(edges, { source: graphNodeId("critical_unknown", action.linkedUnknownId), target: id, type: "addresses", label: "validation action", tone: "unresolved" });
  if (action.linkedKillCriterionId) addGraphEdge(edges, { source: graphNodeId("kill_criterion", action.linkedKillCriterionId), target: id, type: "mitigates", label: "mitigation action", tone: "unresolved" });
  if (action.linkedCoverageCategory) addGraphEdge(edges, { source: id, target: graphNodeId("score_category", action.linkedCoverageCategory), type: "validates", label: "improves coverage", tone: "supporting" });
}

function addDecisionLogNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, decision: any, marketId: string) {
  const id = graphNodeId("decision", decision.id);
  nodes.set(id, {
    id,
    type: "decision",
    label: decision.title,
    status: decision.decisionType,
    lastUpdated: decision.approvedAt.toISOString(),
    summary: decision.rationale,
    href: "/decisions",
    detail: { decision: decision.decision, previousValue: decision.previousValue, newValue: decision.newValue, approvedBy: decision.approvedBy, reversible: decision.reversible },
  });
  addGraphEdge(edges, { source: marketId, target: id, type: "updates", label: "decision log", tone: "historical", historical: true });
}

function addReportUpdateNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, update: any, marketId: string) {
  const id = graphNodeId("report_update", update.id);
  nodes.set(id, { id, type: "report_update", label: update.title, status: update.status, lastUpdated: update.createdAt.toISOString(), summary: update.content, detail: { chapter: update.chapter } });
  addGraphEdge(edges, { source: id, target: marketId, type: "updates", label: "updates report", tone: "historical", historical: true });
}

function addScoreChangeNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, scoreChange: any) {
  const id = graphNodeId("score_change", scoreChange.id);
  nodes.set(id, {
    id,
    type: "score_change",
    label: scoreChange.scoreCategory.label,
    status: scoreChange.frameworkVersion,
    lastUpdated: scoreChange.approvedAt.toISOString(),
    summary: scoreChange.reason,
    detail: { previousScore: scoreChange.previousScore, newScore: scoreChange.newScore, totalScoreBefore: scoreChange.totalScoreBefore, totalScoreAfter: scoreChange.totalScoreAfter, approvedBy: scoreChange.approvedBy },
  });
  addGraphEdge(edges, { source: id, target: graphNodeId("score_category", scoreChange.scoreCategory.key), type: "updates", label: "score change", tone: "historical", historical: true });
  for (const claimId of safeJsonArray(scoreChange.linkedClaimIds)) addGraphEdge(edges, { source: graphNodeId("claim", claimId), target: id, type: "derived_from", label: "linked claim", tone: "historical", historical: true });
}

function addResearchPackageNode(nodes: Map<string, GraphNode>, edges: Map<string, GraphEdge>, pkg: any, marketId: string) {
  const id = graphNodeId("research_package", pkg.id);
  nodes.set(id, { id, type: "research_package", label: pkg.title, status: pkg.status, lastUpdated: pkg.createdAt.toISOString(), summary: `${pkg.packageKey} ${pkg.version}`, detail: { topic: pkg.topic, sequenceNumber: pkg.sequenceNumber, researcher: pkg.researcher } });
  addGraphEdge(edges, { source: id, target: marketId, type: "included_in", label: "research package", tone: "neutral" });
}

function connectActionsToUnknowns(nodes: GraphNode[], edges: Map<string, GraphEdge>, actions: any[]) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const action of actions) {
    const actionId = graphNodeId("research_action", action.id);
    if (!nodeIds.has(actionId)) continue;
    if (action.linkedUnknownId && nodeIds.has(graphNodeId("critical_unknown", action.linkedUnknownId))) {
      addGraphEdge(edges, { source: graphNodeId("critical_unknown", action.linkedUnknownId), target: actionId, type: "addresses", label: "validation action", tone: "unresolved" });
    }
  }
}

function relationId(type: string, id: string, marketId: string) {
  const normalized: Record<string, GraphNodeType> = {
    Market: "market",
    ScoreCategory: "score_category",
    Claim: "claim",
    Source: "source",
    Competitor: "competitor",
    Assumption: "assumption",
    Risk: "risk",
    CriticalUnknown: "critical_unknown",
    KillCriterion: "kill_criterion",
    ScoreHistory: "score_change",
    SuggestedScoreChange: "score_change",
    DecisionLog: "decision",
    ReportUpdate: "report_update",
    ResearchPackageVersion: "research_package",
    ResearchAction: "research_action",
  };
  const nodeType = normalized[type] ?? "market";
  return graphNodeId(nodeType, type === "Market" ? marketId : id);
}

function normalizeRelationType(type: string): GraphEdgeType {
  if (/support|win|validate/i.test(type)) return "supports";
  if (/oppose|lose|risk|kill|block/i.test(type)) return "opposes";
  if (/score/i.test(type)) return "affects_score";
  if (/competitor/i.test(type)) return "linked_to_competitor";
  if (/update/i.test(type)) return "updates";
  if (/address/i.test(type)) return "addresses";
  return "relates_to";
}

function relationTone(type: string, evidenceStatus: string): GraphEdge["tone"] {
  if (/oppose|lose|risk|kill|block/i.test(type)) return "opposing";
  if (/support|win|validate/i.test(type)) return "supporting";
  if (/history|update|decision/i.test(type)) return "historical";
  if (/hypothesis|unverified|open|warning/i.test(evidenceStatus)) return "unresolved";
  return "neutral";
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function splitList(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Fall back to comma splitting for legacy text fields.
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function safeJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
