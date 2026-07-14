"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from "@xyflow/react";
import {
  AlertTriangle,
  BookOpenCheck,
  Box,
  Brain,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Database,
  FileText,
  Filter,
  GitBranch,
  Landmark,
  Network,
  PackageOpen,
  Pin,
  Route,
  Save,
  Search,
  ShieldAlert,
  Target,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { graphNodeTypes, type GraphEdge, type GraphLayout, type GraphNode, type GraphNodeType, type GraphPayload, type GraphQuality } from "@/lib/intelligence/types";

type SearchResult = { nodeId: string; type: string; label: string; summary: string };
type SavedView = {
  id: string;
  name: string;
  marketSlug?: string | null;
  filters: GraphFilters;
  layout: GraphLayout;
  visibleNodeTypes: GraphNodeType[];
  pinnedNodes: string[];
  focusedNode?: string | null;
  viewport?: { x?: number; y?: number; zoom?: number };
};

type GraphFilters = {
  verifiedOnly: boolean;
  unresolvedOnly: boolean;
  supportingOnly: boolean;
  opposingOnly: boolean;
  highImportanceOnly: boolean;
  criticalOnly: boolean;
  scoreImpactingOnly: boolean;
  freshEvidenceOnly: boolean;
  staleEvidenceOnly: boolean;
  competitorsOnly: boolean;
  risksOnly: boolean;
  decisionsOnly: boolean;
  researchPackagesOnly: boolean;
  interviewsOnly: boolean;
  orphanedOnly: boolean;
  dateWindow: "30d" | "90d" | "1y" | "all";
  confidenceThreshold: number;
  importanceThreshold: "any" | "medium" | "high" | "critical";
};

export type GraphNodeData = GraphNode & {
  highlighted?: boolean;
  selected?: boolean;
  onExpand?: (nodeId: string) => void;
  onFocus?: (nodeId: string) => void;
  onHide?: (nodeId: string) => void;
  onPin?: (nodeId: string) => void;
};

const defaultFilters: GraphFilters = {
  verifiedOnly: false,
  unresolvedOnly: false,
  supportingOnly: false,
  opposingOnly: false,
  highImportanceOnly: false,
  criticalOnly: false,
  scoreImpactingOnly: false,
  freshEvidenceOnly: false,
  staleEvidenceOnly: false,
  competitorsOnly: false,
  risksOnly: false,
  decisionsOnly: false,
  researchPackagesOnly: false,
  interviewsOnly: false,
  orphanedOnly: false,
  dateWindow: "all",
  confidenceThreshold: 0,
  importanceThreshold: "any",
};

const nodeTypeLabels: Record<GraphNodeType, string> = {
  market: "Market",
  score_category: "Score Category",
  claim: "Claim",
  source: "Source",
  competitor: "Competitor",
  assumption: "Assumption",
  risk: "Risk",
  critical_unknown: "Critical Unknown",
  kill_criterion: "Kill Criterion",
  score_change: "Score Change",
  decision: "Decision",
  report_update: "Report Update",
  research_package: "Research Package",
  interview: "Interview",
  research_action: "Research Action",
};

const nodeIcons = {
  market: Landmark,
  score_category: Target,
  claim: FileText,
  source: Database,
  competitor: Box,
  assumption: Brain,
  risk: AlertTriangle,
  critical_unknown: CircleHelp,
  kill_criterion: ShieldAlert,
  score_change: GitBranch,
  decision: ClipboardCheck,
  report_update: BookOpenCheck,
  research_package: PackageOpen,
  interview: UserRound,
  research_action: CheckCircle2,
} satisfies Record<GraphNodeType, typeof Network>;

const nodeClasses: Record<GraphNodeType, string> = {
  market: "border-cyan-500/60 bg-cyan-500/10",
  score_category: "border-teal-500/60 bg-teal-500/10",
  claim: "border-violet-500/60 bg-violet-500/10",
  source: "border-sky-500/60 bg-sky-500/10",
  competitor: "border-amber-500/60 bg-amber-500/10",
  assumption: "border-indigo-500/60 bg-indigo-500/10",
  risk: "border-orange-500/60 bg-orange-500/10",
  critical_unknown: "border-rose-500/60 bg-rose-500/10",
  kill_criterion: "border-red-500/60 bg-red-500/10",
  score_change: "border-lime-500/60 bg-lime-500/10",
  decision: "border-emerald-500/60 bg-emerald-500/10",
  report_update: "border-fuchsia-500/60 bg-fuchsia-500/10",
  research_package: "border-slate-400/60 bg-slate-400/10",
  interview: "border-blue-500/60 bg-blue-500/10",
  research_action: "border-green-500/60 bg-green-500/10",
};

const nodeTypes = { intelligence: IntelligenceNode };

export function IntelligenceGraphClient({
  marketSlug,
  initialGraph,
  marketOptions = [],
  title = "Intelligence Graph",
}: {
  marketSlug?: string;
  initialGraph: GraphPayload;
  marketOptions?: { slug: string; name: string }[];
  title?: string;
}) {
  const [graph, setGraph] = useState(initialGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialGraph.focusedNodeId ?? initialGraph.rootNodeId ?? null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<GraphFilters>(defaultFilters);
  const [layout, setLayout] = useState<GraphLayout>(initialGraph.layout);
  const [visibleTypes, setVisibleTypes] = useState<Set<GraphNodeType>>(() => new Set(graphNodeTypes));
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(() => new Set());
  const [pinnedNodes, setPinnedNodes] = useState<Set<string>>(() => new Set());
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(initialGraph.focusedNodeId ?? null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("white-space:intelligence-layout");
    if (stored && isGraphLayout(stored)) setLayout(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("white-space:intelligence-layout", layout);
  }, [layout]);

  useEffect(() => {
    void loadSavedViews();
  }, [marketSlug]);

  const updateGraph = useCallback((payload: GraphPayload) => {
    setGraph((current) => mergeClientGraphs(current, payload));
    if (payload.focusedNodeId) setSelectedNodeId(payload.focusedNodeId);
    if (payload.warnings.length) setStatus(payload.warnings.join(" "));
  }, []);

  const expandNode = useCallback(async (nodeId: string, limit = 25) => {
    if (!marketSlug) {
      setStatus("Expansion requires a selected market.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/intelligence/expand?marketSlug=${encodeURIComponent(marketSlug)}&nodeId=${encodeURIComponent(nodeId)}&limit=${limit}`);
      const payload = await response.json() as GraphPayload;
      updateGraph(payload);
      setGraph((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === nodeId ? { ...node, expanded: true } : node) }));
      setStatus(`Expanded ${nodeLabel(nodeId, graph.nodes)}.`);
    } finally {
      setLoading(false);
    }
  }, [graph.nodes, marketSlug, updateGraph]);

  const runTrace = useCallback(async (mode: "decision" | "source-impact") => {
    if (!marketSlug) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ marketSlug, mode });
      if (mode === "source-impact" && selectedNodeId) params.set("sourceNodeId", selectedNodeId);
      const response = await fetch(`/api/intelligence/path?${params}`);
      const payload = await response.json() as GraphPayload;
      setGraph(payload);
      setLayout(payload.layout);
      setFocusedNodeId(payload.focusedNodeId ?? null);
      setSelectedNodeId(payload.focusedNodeId ?? payload.rootNodeId ?? null);
      setStatus(mode === "decision" ? "Decision trace loaded." : "Source impact trace loaded.");
    } finally {
      setLoading(false);
    }
  }, [marketSlug, selectedNodeId]);

  const searchGraph = useCallback(async () => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const params = new URLSearchParams({ q: query });
    if (marketSlug) params.set("marketSlug", marketSlug);
    const response = await fetch(`/api/intelligence/search?${params}`);
    const payload = await response.json() as { results: SearchResult[] };
    setSearchResults(payload.results);
    setStatus(`${payload.results.length} graph search result(s).`);
  }, [marketSlug, query]);

  const loadSavedViews = useCallback(async () => {
    const params = new URLSearchParams();
    if (marketSlug) params.set("marketSlug", marketSlug);
    const response = await fetch(`/api/intelligence/views?${params}`);
    const payload = await response.json() as { views: SavedView[] };
    setSavedViews(payload.views);
  }, [marketSlug]);

  const saveView = useCallback(async () => {
    if (!viewName.trim()) {
      setStatus("Name the view before saving.");
      return;
    }
    const response = await fetch("/api/intelligence/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: viewName,
        marketSlug,
        filters,
        layout,
        visibleNodeTypes: [...visibleTypes],
        pinnedNodes: [...pinnedNodes],
        focusedNode: focusedNodeId,
        viewport: {},
      }),
    });
    if (response.ok) {
      setViewName("");
      setStatus("Saved graph view.");
      await loadSavedViews();
    }
  }, [filters, focusedNodeId, layout, loadSavedViews, marketSlug, pinnedNodes, viewName, visibleTypes]);

  const applySavedView = useCallback((view: SavedView) => {
    setFilters({ ...defaultFilters, ...view.filters });
    setLayout(view.layout);
    setVisibleTypes(new Set(view.visibleNodeTypes.length ? view.visibleNodeTypes : graphNodeTypes));
    setPinnedNodes(new Set(view.pinnedNodes ?? []));
    setFocusedNodeId(view.focusedNode ?? null);
    setSelectedNodeId(view.focusedNode ?? selectedNodeId);
    setStatus(`Loaded view: ${view.name}.`);
  }, [selectedNodeId]);

  const filteredGraph = useMemo(() => applyFilters(graph, filters, query, visibleTypes, hiddenNodes, focusedNodeId), [graph, filters, query, visibleTypes, hiddenNodes, focusedNodeId]);

  const reactFlowNodes = useMemo(() => layoutNodes(filteredGraph.nodes, layout, selectedNodeId, pinnedNodes, {
    onExpand: (nodeId) => void expandNode(nodeId),
    onFocus: setFocusedNodeId,
    onHide: (nodeId) => setHiddenNodes((current) => new Set(current).add(nodeId)),
    onPin: (nodeId) => setPinnedNodes((current) => toggleSet(current, nodeId)),
  }), [expandNode, filteredGraph.nodes, focusedNodeId, layout, pinnedNodes, selectedNodeId]);

  const reactFlowEdges = useMemo(() => filteredGraph.edges.map(toReactFlowEdge), [filteredGraph.edges]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  useEffect(() => setNodes(reactFlowNodes), [reactFlowNodes, setNodes]);
  useEffect(() => setEdges(reactFlowEdges), [reactFlowEdges, setEdges]);

  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const onNodeClick: NodeMouseHandler<Node<GraphNodeData>> = (_, node) => {
    setSelectedNodeId(node.id);
    setSelectedEdge(null);
  };
  const onEdgeClick: EdgeMouseHandler = (_, edge) => {
    const original = graph.edges.find((item) => item.id === edge.id) ?? null;
    setSelectedEdge(original);
  };

  return (
    <div className="grid min-w-0 gap-4 overflow-hidden">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-3">
          <Card>
            <CardContent className="grid min-w-0 gap-3 pt-4">
              <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
                  <Input suppressHydrationWarning value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchGraph(); }} className="pl-8" placeholder="Search claims, sources, competitors, decisions..." />
                </div>
                <Button variant="outline" onClick={() => void searchGraph()}>Search</Button>
                <Button variant="outline" onClick={() => void runTrace("decision")}><Route data-icon="inline-start" />Trace Decision</Button>
                <Button variant="outline" onClick={() => void runTrace("source-impact")}><GitBranch data-icon="inline-start" />Trace Source Impact</Button>
              </div>
              <div className="grid min-w-0 gap-2 lg:grid-cols-[160px_minmax(0,1fr)_160px]">
                <Select value={layout} onValueChange={(value) => setLayout(value as GraphLayout)}>
                  <SelectTrigger className="w-full"><SelectValue>{layoutLabel(layout)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {(["hierarchical", "radial", "force", "score", "competitor", "evidence", "decision"] as GraphLayout[]).map((item) => <SelectItem key={item} value={item}>{layoutLabel(item)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFocusedNodeId(null)}>Clear Focus</Button>
                  <Button variant="outline" size="sm" onClick={() => setHiddenNodes(new Set())}>Show Hidden</Button>
                  <Button variant="outline" size="sm" onClick={() => selectedNodeId && void expandNode(selectedNodeId, 75)}>Expand All Connected</Button>
                  {marketOptions.length ? <GlobalMarketJump marketOptions={marketOptions} /> : null}
                </div>
                <div className="text-right text-sm text-muted-foreground">{loading ? "Loading..." : `${filteredGraph.nodes.length} nodes / ${filteredGraph.edges.length} edges`}</div>
              </div>
              {searchResults.length ? (
                <div className="flex flex-wrap gap-2">
                  {searchResults.map((result) => (
                    <Button key={result.nodeId} variant="secondary" size="sm" onClick={() => { setSelectedNodeId(result.nodeId); setFocusedNodeId(null); setQuery(result.label); }}>
                      {result.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Tabs defaultValue="filters" className="min-w-0">
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="filters"><Filter data-icon="inline-start" />Filters</TabsTrigger>
              <TabsTrigger value="types"><Box data-icon="inline-start" />Node Types</TabsTrigger>
              <TabsTrigger value="quality"><ShieldAlert data-icon="inline-start" />Quality</TabsTrigger>
              <TabsTrigger value="views"><Save data-icon="inline-start" />Saved Views</TabsTrigger>
              <TabsTrigger value="legend"><Network data-icon="inline-start" />Legend</TabsTrigger>
            </TabsList>
            <TabsContent value="filters">
              <Card><CardContent className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-4">
                <GraphToggle label="Verified only" checked={filters.verifiedOnly} onChange={(value) => setFilters((current) => ({ ...current, verifiedOnly: value }))} />
                <GraphToggle label="Unresolved only" checked={filters.unresolvedOnly} onChange={(value) => setFilters((current) => ({ ...current, unresolvedOnly: value }))} />
                <GraphToggle label="Supporting only" checked={filters.supportingOnly} onChange={(value) => setFilters((current) => ({ ...current, supportingOnly: value, opposingOnly: value ? false : current.opposingOnly }))} />
                <GraphToggle label="Opposing only" checked={filters.opposingOnly} onChange={(value) => setFilters((current) => ({ ...current, opposingOnly: value, supportingOnly: value ? false : current.supportingOnly }))} />
                <GraphToggle label="High importance" checked={filters.highImportanceOnly} onChange={(value) => setFilters((current) => ({ ...current, highImportanceOnly: value }))} />
                <GraphToggle label="Critical only" checked={filters.criticalOnly} onChange={(value) => setFilters((current) => ({ ...current, criticalOnly: value }))} />
                <GraphToggle label="Score-impacting" checked={filters.scoreImpactingOnly} onChange={(value) => setFilters((current) => ({ ...current, scoreImpactingOnly: value }))} />
                <GraphToggle label="Fresh evidence" checked={filters.freshEvidenceOnly} onChange={(value) => setFilters((current) => ({ ...current, freshEvidenceOnly: value, staleEvidenceOnly: value ? false : current.staleEvidenceOnly }))} />
                <GraphToggle label="Stale evidence" checked={filters.staleEvidenceOnly} onChange={(value) => setFilters((current) => ({ ...current, staleEvidenceOnly: value, freshEvidenceOnly: value ? false : current.freshEvidenceOnly }))} />
                <GraphToggle label="Competitors only" checked={filters.competitorsOnly} onChange={(value) => setFilters((current) => onlyFamily(current, "competitorsOnly", value))} />
                <GraphToggle label="Risks only" checked={filters.risksOnly} onChange={(value) => setFilters((current) => onlyFamily(current, "risksOnly", value))} />
                <GraphToggle label="Decisions only" checked={filters.decisionsOnly} onChange={(value) => setFilters((current) => onlyFamily(current, "decisionsOnly", value))} />
                <GraphToggle label="Research packages" checked={filters.researchPackagesOnly} onChange={(value) => setFilters((current) => onlyFamily(current, "researchPackagesOnly", value))} />
                <GraphToggle label="Interviews only" checked={filters.interviewsOnly} onChange={(value) => setFilters((current) => onlyFamily(current, "interviewsOnly", value))} />
                <GraphToggle label="Orphaned intelligence" checked={filters.orphanedOnly} onChange={(value) => setFilters((current) => ({ ...current, orphanedOnly: value }))} />
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Date window</label>
                  <Select value={filters.dateWindow} onValueChange={(value) => setFilters((current) => ({ ...current, dateWindow: value as GraphFilters["dateWindow"] }))}>
                    <SelectTrigger className="w-full"><SelectValue>{dateWindowLabel(filters.dateWindow)}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="1y">Last year</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Confidence threshold: {filters.confidenceThreshold}%</label>
                  <input suppressHydrationWarning type="range" min="0" max="100" value={filters.confidenceThreshold} onChange={(event) => setFilters((current) => ({ ...current, confidenceThreshold: Number(event.target.value) }))} />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs text-muted-foreground">Importance threshold</label>
                  <Select value={filters.importanceThreshold} onValueChange={(value) => setFilters((current) => ({ ...current, importanceThreshold: value as GraphFilters["importanceThreshold"] }))}>
                    <SelectTrigger className="w-full"><SelectValue>{filters.importanceThreshold}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="medium">Medium+</SelectItem>
                      <SelectItem value="high">High+</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="types">
              <Card><CardContent className="flex flex-wrap gap-3 pt-4">
                {graphNodeTypes.map((type) => <GraphToggle key={type} label={nodeTypeLabels[type]} checked={visibleTypes.has(type)} onChange={() => setVisibleTypes((current) => toggleSet(current, type))} />)}
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="quality">
              <QualityGrid quality={graph.quality} onIssue={(issue) => {
                if (issue === "orphaned") setFilters((current) => ({ ...current, orphanedOnly: true }));
                if (issue === "stale") setFilters((current) => ({ ...current, staleEvidenceOnly: true }));
                if (issue === "weak") setFilters((current) => ({ ...current, scoreImpactingOnly: true }));
              }} />
            </TabsContent>
            <TabsContent value="views">
              <Card><CardContent className="grid gap-3 pt-4">
                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input value={viewName} onChange={(event) => setViewName(event.target.value)} placeholder="Name this graph view..." />
                  <Button onClick={() => void saveView()}><Save data-icon="inline-start" />Save View</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedViews.length === 0 ? <div className="text-sm text-muted-foreground">No saved graph views yet.</div> : savedViews.map((view) => (
                    <Button key={view.id} variant="outline" size="sm" onClick={() => applySavedView(view)}>{view.name}</Button>
                  ))}
                </div>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="legend">
              <Legend />
            </TabsContent>
          </Tabs>

          {status || graph.warnings.length ? (
            <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
              {status ?? graph.warnings.join(" ")}
            </div>
          ) : null}

          <div className="h-[680px] overflow-hidden rounded-md border bg-background">
            {nodes.length === 0 ? (
              <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
                <div>
                  <Network className="mx-auto mb-3 size-8" />
                  No graph nodes match the current filters.
                </div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                defaultViewport={{ x: 40, y: 40, zoom: 0.72 }}
                nodesDraggable
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
              >
                <Background />
                <Controls />
                <MiniMap pannable zoomable nodeColor={(node) => miniMapColor((node.data as GraphNodeData).type)} />
              </ReactFlow>
            )}
          </div>
        </div>
        <DetailPanel
          title={title}
          node={selectedNode}
          edge={selectedEdge}
          quality={graph.quality}
          onExpand={(nodeId) => void expandNode(nodeId)}
          onFocus={(nodeId) => setFocusedNodeId(nodeId)}
          onHide={(nodeId) => setHiddenNodes((current) => new Set(current).add(nodeId))}
          onPin={(nodeId) => setPinnedNodes((current) => toggleSet(current, nodeId))}
          pinned={selectedNode ? pinnedNodes.has(selectedNode.id) : false}
        />
      </div>
    </div>
  );
}

function IntelligenceNode(props: NodeProps<Node<GraphNodeData>>) {
  const data = props.data;
  const Icon = nodeIcons[data.type];
  const isSelected = data.selected;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") data.onFocus?.(data.id);
    if (event.key.toLowerCase() === "e") data.onExpand?.(data.id);
    if (event.key.toLowerCase() === "h") data.onHide?.(data.id);
    if (event.key.toLowerCase() === "p") data.onPin?.(data.id);
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      className={cn(
        "w-[230px] rounded-md border p-3 text-left text-xs shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
        nodeClasses[data.type],
        data.highlighted && "ring-2 ring-primary",
        isSelected && "ring-2 ring-cyan-300",
      )}
      aria-label={`${nodeTypeLabels[data.type]} ${data.label}`}
    >
      <Handle type="target" position={Position.Left} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0" />
          <div className="truncate font-medium">{data.label}</div>
        </div>
        {data.pinned ? <Pin className="size-3 shrink-0" /> : null}
      </div>
      <div className="mt-1 line-clamp-2 text-muted-foreground">{data.summary}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline">{nodeTypeLabels[data.type]}</Badge>
        {data.status ? <Badge variant="secondary">{data.status}</Badge> : null}
        {data.importance ? <Badge variant={data.importance === "critical" ? "destructive" : "outline"}>{data.importance}</Badge> : null}
        {data.confidence !== undefined ? <Badge variant="outline">{Math.round(data.confidence)}%</Badge> : null}
        {data.evidenceCount !== undefined ? <Badge variant="outline">{data.evidenceCount} ev</Badge> : null}
        {data.demo ? <Badge variant="outline">Demo / Hypothesis</Badge> : null}
      </div>
      <div className="mt-2 flex gap-1">
        <button className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-background/60" onClick={(event) => { event.stopPropagation(); data.onExpand?.(data.id); }}>Expand</button>
        <button className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-background/60" onClick={(event) => { event.stopPropagation(); data.onFocus?.(data.id); }}>Focus</button>
        <button className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-background/60" onClick={(event) => { event.stopPropagation(); data.onPin?.(data.id); }}>Pin</button>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function DetailPanel({ title, node, edge, quality, onExpand, onFocus, onHide, onPin, pinned }: { title: string; node: GraphNode | null; edge: GraphEdge | null; quality: GraphQuality; onExpand: (nodeId: string) => void; onFocus: (nodeId: string) => void; onHide: (nodeId: string) => void; onPin: (nodeId: string) => void; pinned: boolean }) {
  return (
    <Card className="sticky top-4 h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><Network className="size-4" />{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        {edge ? (
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Selected Edge</div>
            <div className="mt-1 font-medium">{edge.label}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{edge.type}</Badge>
              <Badge variant="secondary">{edge.tone}</Badge>
              {edge.confidence !== undefined ? <Badge variant="outline">{Math.round(edge.confidence * 100)}% confidence</Badge> : null}
            </div>
          </div>
        ) : null}
        {!node ? (
          <div className="text-muted-foreground">Select a node to inspect claims, sources, competitors, decisions, score impact, and linked records.</div>
        ) : (
          <>
            <div>
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{nodeTypeLabels[node.type]}</div>
              <div className="mt-1 text-lg font-semibold">{node.label}</div>
              {node.summary ? <p className="mt-2 text-muted-foreground">{node.summary}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {node.status ? <Badge variant="secondary">{node.status}</Badge> : null}
              {node.importance ? <Badge variant={node.importance === "critical" ? "destructive" : "outline"}>{node.importance}</Badge> : null}
              {node.confidence !== undefined ? <Badge variant="outline">{Math.round(node.confidence)}% confidence</Badge> : null}
              {node.evidenceCount !== undefined ? <Badge variant="outline">{node.evidenceCount} evidence</Badge> : null}
              {node.freshness ? <Badge variant="outline">{node.freshness}</Badge> : null}
            </div>
            <DetailMatrix node={node} />
            <div className="grid gap-2">
              <Button variant="outline" size="sm" onClick={() => onExpand(node.id)}>Expand One Level</Button>
              <Button variant="outline" size="sm" onClick={() => onFocus(node.id)}>Focus On Node</Button>
              <Button variant="outline" size="sm" onClick={() => onPin(node.id)}>{pinned ? "Unpin Node" : "Pin Node"}</Button>
              <Button variant="outline" size="sm" onClick={() => onHide(node.id)}>Hide Node</Button>
              {node.href ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={node.href}>Open Full Record</Link> : null}
            </div>
          </>
        )}
        <div className="rounded-md border bg-background p-3">
          <div className="font-medium">Graph Quality</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <Metric label="Nodes" value={quality.totalNodes} />
            <Metric label="Edges" value={quality.totalEdges} />
            <Metric label="Verified claims" value={quality.verifiedClaims} />
            <Metric label="Unresolved" value={quality.unresolvedClaims} />
            <Metric label="Claim orphans" value={quality.orphanedClaims} />
            <Metric label="Stale sources" value={quality.staleSources} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailMatrix({ node }: { node: GraphNode }) {
  const entries = Object.entries(node.detail ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0 && !node.lastUpdated) return null;
  return (
    <div className="grid gap-2 rounded-md border bg-background p-3">
      {node.lastUpdated ? <DetailRow label="Last updated" value={new Date(node.lastUpdated).toLocaleDateString()} /> : null}
      {entries.map(([key, value]) => <DetailRow key={key} label={humanize(key)} value={Array.isArray(value) ? value.join(", ") : String(value)} />)}
    </div>
  );
}

function QualityGrid({ quality, onIssue }: { quality: GraphQuality; onIssue: (issue: "orphaned" | "stale" | "weak") => void }) {
  const items = [
    ["Total nodes", quality.totalNodes],
    ["Total edges", quality.totalEdges],
    ["Verified claims", quality.verifiedClaims],
    ["Unresolved claims", quality.unresolvedClaims],
    ["Orphaned claims", quality.orphanedClaims, "orphaned"],
    ["Sources without claims", quality.sourcesWithoutClaims, "orphaned"],
    ["Claims without sources", quality.claimsWithoutSources, "orphaned"],
    ["Stale sources", quality.staleSources, "stale"],
    ["Weak evidence categories", quality.weakEvidenceCategories, "weak"],
    ["Disconnected competitors", quality.disconnectedCompetitors, "orphaned"],
    ["Risks without evidence", quality.risksWithoutEvidence, "orphaned"],
    ["Decisions without rationale", quality.decisionsWithoutRationale],
    ["Score changes without claims", quality.scoreChangesWithoutClaims, "orphaned"],
    ["Report updates without evidence", quality.reportUpdatesWithoutEvidence, "orphaned"],
    ["Unknowns without validation actions", quality.unknownsWithoutValidationActions, "orphaned"],
  ] as const;
  return (
    <Card><CardContent className="grid gap-2 pt-4 md:grid-cols-3 xl:grid-cols-5">
      {items.map(([label, value, issue]) => (
        <button key={label} className="rounded-md border bg-background p-3 text-left hover:bg-accent" onClick={() => issue && onIssue(issue)}>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
        </button>
      ))}
    </CardContent></Card>
  );
}

function Legend() {
  return (
    <Card><CardContent className="grid gap-4 pt-4 md:grid-cols-2">
      <div>
        <div className="mb-2 font-medium">Node Types</div>
        <div className="flex flex-wrap gap-2">
          {graphNodeTypes.map((type) => {
            const Icon = nodeIcons[type];
            return <Badge key={type} variant="outline" className={cn("gap-1", nodeClasses[type])}><Icon />{nodeTypeLabels[type]}</Badge>;
          })}
        </div>
      </div>
      <div>
        <div className="mb-2 font-medium">Edge Styles</div>
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div>Solid cyan: supporting or validating evidence.</div>
          <div>Dashed rose: opposing, blocking, or kill-risk evidence.</div>
          <div>Dotted amber: unresolved hypotheses and open questions.</div>
          <div>Muted line: neutral relationship.</div>
          <div>Green historical line: score changes, decisions, and report updates.</div>
        </div>
      </div>
    </CardContent></Card>
  );
}

function GlobalMarketJump({ marketOptions }: { marketOptions: { slug: string; name: string }[] }) {
  return (
    <Select onValueChange={(slug) => { window.location.href = `/markets/${slug}/intelligence`; }}>
      <SelectTrigger><SelectValue>Open Market Graph</SelectValue></SelectTrigger>
      <SelectContent>
        {marketOptions.map((market) => <SelectItem key={market.slug} value={market.slug}>{market.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function GraphToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />
      {label}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="font-mono text-foreground">{value}</span></div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1"><div className="text-xs text-muted-foreground">{label}</div><div className="break-words">{value}</div></div>;
}

function layoutNodes(nodes: GraphNode[], layout: GraphLayout, selectedNodeId: string | null, pinnedNodes: Set<string>, actions: Pick<GraphNodeData, "onExpand" | "onFocus" | "onHide" | "onPin">): Node<GraphNodeData>[] {
  const buckets = bucketNodes(nodes, layout);
  return nodes.map((node, index) => {
    const bucket = buckets.get(node.id) ?? { column: 0, row: index };
    return {
      id: node.id,
      type: "intelligence",
      position: positionFor(layout, bucket.column, bucket.row, index, nodes.length),
      data: {
        ...node,
        ...actions,
        selected: selectedNodeId === node.id,
        pinned: pinnedNodes.has(node.id),
      },
    };
  });
}

function bucketNodes(nodes: GraphNode[], layout: GraphLayout) {
  const order = layout === "decision"
    ? ["research_package", "source", "interview", "claim", "competitor", "score_change", "score_category", "decision", "market", "critical_unknown", "kill_criterion", "research_action", "risk", "assumption", "report_update"]
    : layout === "evidence"
      ? ["source", "interview", "claim", "competitor", "score_category", "score_change", "decision", "market", "critical_unknown", "kill_criterion", "risk", "assumption", "research_action", "report_update", "research_package"]
      : layout === "competitor"
        ? ["competitor", "claim", "source", "interview", "risk", "kill_criterion", "score_category", "decision", "market", "critical_unknown", "research_action", "assumption", "score_change", "report_update", "research_package"]
        : layout === "score"
          ? ["market", "decision", "score_category", "claim", "source", "interview", "score_change", "competitor", "critical_unknown", "kill_criterion", "research_action", "risk", "assumption", "report_update", "research_package"]
          : ["market", "score_category", "claim", "source", "interview", "competitor", "critical_unknown", "kill_criterion", "research_action", "risk", "assumption", "score_change", "decision", "report_update", "research_package"];
  const rowCounts = new Map<number, number>();
  const result = new Map<string, { column: number; row: number }>();
  const presentTypes = [...new Set(nodes.map((node) => node.type))]
    .sort((a, b) => Math.max(0, order.indexOf(a)) - Math.max(0, order.indexOf(b)));
  const compactColumn = new Map(presentTypes.map((type, index) => [type, index]));
  for (const node of nodes) {
    const column = compactColumn.get(node.type) ?? 0;
    const row = rowCounts.get(column) ?? 0;
    rowCounts.set(column, row + 1);
    result.set(node.id, { column, row });
  }
  return result;
}

function positionFor(layout: GraphLayout, column: number, row: number, index: number, total: number) {
  if (layout === "radial" || layout === "force") {
    const angle = (index / Math.max(1, total)) * Math.PI * 2;
    const radius = layout === "force" ? 260 + (index % 4) * 90 : 380;
    return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius) };
  }
  return { x: column * 300, y: row * 150 + (column % 2) * 60 };
}

function toReactFlowEdge(edge: GraphEdge): Edge {
  const stroke = edge.tone === "supporting" ? "#22c55e" : edge.tone === "opposing" ? "#fb7185" : edge.tone === "unresolved" ? "#f59e0b" : edge.tone === "historical" ? "#84cc16" : "#64748b";
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.tone === "unresolved",
    style: { stroke, strokeWidth: 1.5, strokeDasharray: edge.tone === "opposing" ? "6 4" : edge.tone === "unresolved" ? "2 5" : undefined },
    labelStyle: { fill: "currentColor", fontSize: 11 },
    labelBgStyle: { fill: "hsl(var(--card))", fillOpacity: 0.86 },
  };
}

function applyFilters(graph: GraphPayload, filters: GraphFilters, query: string, visibleTypes: Set<GraphNodeType>, hiddenNodes: Set<string>, focusedNodeId: string | null): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const connected = new Set<string>();
  if (focusedNodeId) {
    connected.add(focusedNodeId);
    for (const edge of graph.edges) {
      if (edge.source === focusedNodeId) connected.add(edge.target);
      if (edge.target === focusedNodeId) connected.add(edge.source);
    }
  }
  const edgeConnected = new Set(graph.edges.map((edge) => edge.source).concat(graph.edges.map((edge) => edge.target)));
  const textQuery = query.trim().toLowerCase();
  const minDate = minDateFor(filters.dateWindow);
  const nodes = graph.nodes.filter((node) => {
    if (!visibleTypes.has(node.type)) return false;
    if (hiddenNodes.has(node.id)) return false;
    if (focusedNodeId && !connected.has(node.id)) return false;
    if (textQuery && ![node.label, node.summary, node.status, node.importance, node.freshness].join(" ").toLowerCase().includes(textQuery)) return false;
    if (filters.verifiedOnly && !["verified", "incorporated"].includes(node.status ?? "")) return false;
    if (filters.unresolvedOnly && ["verified", "incorporated", "validated", "disproven", "safe", "completed", "dismissed"].includes(node.status ?? "")) return false;
    if (filters.highImportanceOnly && !["high", "critical", "fatal"].includes(node.importance ?? "")) return false;
    if (filters.criticalOnly && node.importance !== "critical" && node.type !== "critical_unknown") return false;
    if (filters.scoreImpactingOnly && !["score_category", "claim", "score_change", "decision", "research_action"].includes(node.type)) return false;
    if (filters.freshEvidenceOnly && ["stale", "aging", "unknown"].includes(node.freshness ?? "")) return false;
    if (filters.staleEvidenceOnly && !["stale", "aging", "unknown"].includes(node.freshness ?? "")) return false;
    if (filters.competitorsOnly && !["competitor", "claim", "source", "interview", "risk", "kill_criterion"].includes(node.type)) return false;
    if (filters.risksOnly && !["risk", "critical_unknown", "kill_criterion", "research_action", "claim"].includes(node.type)) return false;
    if (filters.decisionsOnly && !["decision", "score_change", "score_category", "claim", "source", "interview"].includes(node.type)) return false;
    if (filters.researchPackagesOnly && !["research_package", "claim", "source", "report_update", "score_change"].includes(node.type)) return false;
    if (filters.interviewsOnly && node.type !== "interview") return false;
    if (filters.orphanedOnly && edgeConnected.has(node.id)) return false;
    if (filters.confidenceThreshold && Number(node.confidence ?? 0) < filters.confidenceThreshold) return false;
    if (!importancePasses(node.importance, filters.importanceThreshold)) return false;
    if (minDate && node.lastUpdated && new Date(node.lastUpdated) < minDate) return false;
    return true;
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => {
    if (!ids.has(edge.source) || !ids.has(edge.target)) return false;
    if (filters.supportingOnly && edge.tone !== "supporting") return false;
    if (filters.opposingOnly && edge.tone !== "opposing") return false;
    return true;
  });
  return { nodes, edges };
}

function mergeClientGraphs(current: GraphPayload, next: GraphPayload): GraphPayload {
  const nodes = new Map(current.nodes.map((node) => [node.id, node]));
  const edges = new Map(current.edges.map((edge) => [edge.id, edge]));
  next.nodes.forEach((node) => nodes.set(node.id, { ...nodes.get(node.id), ...node }));
  next.edges.forEach((edge) => edges.set(edge.id, edge));
  return { ...current, nodes: [...nodes.values()], edges: [...edges.values()], quality: next.quality, warnings: [...new Set([...current.warnings, ...next.warnings])] };
}

function onlyFamily(current: GraphFilters, key: keyof Pick<GraphFilters, "competitorsOnly" | "risksOnly" | "decisionsOnly" | "researchPackagesOnly" | "interviewsOnly">, value: boolean): GraphFilters {
  return { ...current, competitorsOnly: false, risksOnly: false, decisionsOnly: false, researchPackagesOnly: false, interviewsOnly: false, [key]: value };
}

function toggleSet<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function minDateFor(window: GraphFilters["dateWindow"]) {
  if (window === "all") return null;
  const date = new Date();
  date.setDate(date.getDate() - (window === "30d" ? 30 : window === "90d" ? 90 : 365));
  return date;
}

function importancePasses(value: string | undefined, threshold: GraphFilters["importanceThreshold"]) {
  if (threshold === "any") return true;
  const rank = (item: string | undefined) => item === "critical" || item === "fatal" ? 3 : item === "high" ? 2 : item === "medium" ? 1 : 0;
  return rank(value) >= rank(threshold);
}

function nodeLabel(nodeId: string, nodes: GraphNode[]) {
  return nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function layoutLabel(layout: GraphLayout) {
  return layout === "force" ? "Force-directed" : `${layout[0].toUpperCase()}${layout.slice(1)}-centric`.replace("Hierarchical-centric", "Hierarchical").replace("Radial-centric", "Radial");
}

function dateWindowLabel(value: GraphFilters["dateWindow"]) {
  return value === "30d" ? "Last 30 days" : value === "90d" ? "Last 90 days" : value === "1y" ? "Last year" : "All time";
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function isGraphLayout(value: string): value is GraphLayout {
  return ["hierarchical", "radial", "force", "score", "competitor", "evidence", "decision"].includes(value);
}

function miniMapColor(type: GraphNodeType) {
  if (type === "market") return "#06b6d4";
  if (type === "score_category") return "#14b8a6";
  if (type === "claim") return "#8b5cf6";
  if (type === "competitor") return "#f59e0b";
  if (type === "decision") return "#22c55e";
  if (type === "critical_unknown" || type === "kill_criterion") return "#fb7185";
  return "#64748b";
}
