import assert from "node:assert/strict";
import { addGraphEdge, buildDecisionTrace, buildInitialMarketGraph, buildQualitySummary, expandGraphNode, graphNodeId, searchGraphRecords } from "../src/lib/intelligence/graph";
import { getDb } from "../src/lib/db";

async function main() {
  const edgeMap = new Map();
  addGraphEdge(edgeMap, { source: "a", target: "b", type: "supports", label: "supports", tone: "supporting" });
  addGraphEdge(edgeMap, { source: "a", target: "b", type: "supports", label: "supports", tone: "supporting" });
  assert.equal(edgeMap.size, 1, "duplicate edge prevention should keep one edge");

  const quality = buildQualitySummary([
    { id: "claim:1", type: "claim", label: "Claim", status: "needs_review", evidenceCount: 0 },
    { id: "source:1", type: "source", label: "Source", status: "verified", freshness: "stale" },
  ], []);
  assert.equal(quality.claimsWithoutSources, 1, "orphan detection should find claims without sources");
  assert.equal(quality.staleSources, 1, "quality should count stale sources");

  const workshop = await buildInitialMarketGraph("workshop");
  assert.ok(workshop.nodes.some((node) => node.type === "market" && node.label === "Workshop"), "Workshop graph should include market node");
  assert.ok(workshop.nodes.some((node) => node.type === "score_category"), "initial graph should include score categories");
  assert.ok(workshop.edges.length > 0, "initial graph should include edges");

  const expandable = workshop.nodes.find((node) => ["claim", "critical_unknown", "kill_criterion", "competitor", "research_package"].includes(node.type));
  assert.ok(expandable, "initial graph should include at least one expandable intelligence node");
  const expanded = await expandGraphNode("workshop", expandable!.id, 25);
  assert.ok(Array.isArray(expanded.nodes) && Array.isArray(expanded.edges), "node expansion should return graph payload arrays");

  const trace = await buildDecisionTrace("workshop");
  assert.equal(trace.layout, "decision", "decision trace should use decision layout");
  assert.ok(trace.nodes.some((node) => node.type === "decision"), "decision trace should include decision nodes");

  const search = await searchGraphRecords("workshop", "Jobber");
  assert.ok(search.length > 0, "search should find graph records");

  const db = getDb();
  const saved = await db.savedGraphView.findMany({ where: { marketSlug: "workshop" } });
  if (saved.length === 0) {
    const market = await db.market.findUniqueOrThrow({ where: { slug: "workshop" } });
    await db.savedGraphView.create({
      data: {
        name: "Workshop Decision Trace Test View",
        marketId: market.id,
        marketSlug: market.slug,
        filters: JSON.stringify({ scoreImpactingOnly: true }),
        layout: "decision",
        visibleNodeTypes: JSON.stringify(["market", "decision", "score_category", "claim", "source"]),
        pinnedNodes: JSON.stringify([]),
        viewport: JSON.stringify({}),
      },
    });
  }
  const savedAfterEnsure = await db.savedGraphView.findMany({ where: { marketSlug: "workshop" } });
  assert.ok(savedAfterEnsure.length > 0, "saved views should be persisted in SQLite");

  const source = expanded.nodes.find((node) => node.type === "source" || node.type === "interview");
  if (source) {
    const sourceExpansion = await expandGraphNode("workshop", graphNodeId(source.type, source.id.split(":").slice(1).join(":")), 25);
    assert.ok(sourceExpansion.nodes.length >= 1, "source expansion should return connected records");
  }
}

main()
  .then(() => {
    console.log("Intelligence graph tests passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
