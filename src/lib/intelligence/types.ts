export const graphNodeTypes = [
  "market",
  "score_category",
  "claim",
  "source",
  "competitor",
  "assumption",
  "risk",
  "critical_unknown",
  "kill_criterion",
  "score_change",
  "decision",
  "report_update",
  "research_package",
  "interview",
  "research_action",
] as const;

export type GraphNodeType = (typeof graphNodeTypes)[number];

export const graphEdgeTypes = [
  "supports",
  "opposes",
  "relates_to",
  "affects_score",
  "linked_to_market",
  "linked_to_competitor",
  "derived_from",
  "resolves",
  "validates",
  "contradicts",
  "triggered_by",
  "updates",
  "included_in",
  "created_by",
  "addresses",
  "blocks",
  "mitigates",
] as const;

export type GraphEdgeType = (typeof graphEdgeTypes)[number];
export type GraphLayout = "hierarchical" | "radial" | "force" | "score" | "competitor" | "evidence" | "decision";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
  status?: string;
  confidence?: number;
  evidenceCount?: number;
  lastUpdated?: string;
  importance?: string;
  freshness?: string;
  summary?: string;
  href?: string;
  expanded?: boolean;
  pinned?: boolean;
  hidden?: boolean;
  demo?: boolean;
  detail?: Record<string, string | number | boolean | null | string[]>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  type: GraphEdgeType;
  label: string;
  tone: "supporting" | "opposing" | "neutral" | "unresolved" | "historical";
  confidence?: number;
  historical?: boolean;
};

export type GraphQuality = {
  totalNodes: number;
  totalEdges: number;
  verifiedClaims: number;
  unresolvedClaims: number;
  orphanedClaims: number;
  sourcesWithoutClaims: number;
  claimsWithoutSources: number;
  staleSources: number;
  weakEvidenceCategories: number;
  disconnectedCompetitors: number;
  risksWithoutEvidence: number;
  decisionsWithoutRationale: number;
  scoreChangesWithoutClaims: number;
  reportUpdatesWithoutEvidence: number;
  unknownsWithoutValidationActions: number;
};

export type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  quality: GraphQuality;
  rootNodeId?: string;
  focusedNodeId?: string;
  layout: GraphLayout;
  warnings: string[];
};
