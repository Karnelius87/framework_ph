import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { scoringCategories, weightedContribution } from "@/config/scoring";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewActions } from "@/app/research/inbox/[importId]/review-actions";
import { decodeJson } from "@/lib/research/json";

export const dynamic = "force-dynamic";

export default async function ResearchImportReviewPage({ params }: { params: Promise<{ importId: string }> }) {
  const { importId } = await params;
  const db = getDb();
  const researchImport = await db.researchImport.findUnique({
    where: { importId },
    include: { items: true, market: { include: { scores: { include: { scoreCategory: true } } } } },
  });

  if (!researchImport) notFound();

  const itemsByType = (type: string) => researchImport.items.filter((item) => item.itemType === type);
  const warningItems = [
    ...decodeJson<string[]>(researchImport.validationWarnings, []),
    ...decodeJson<string[]>(researchImport.duplicateWarnings, []),
  ];

  return (
    <div>
      <PageHeader
        title={researchImport.sequenceNumber ? `Research Package #${String(researchImport.sequenceNumber).padStart(3, "0")}: ${researchImport.title}` : researchImport.title}
        description={`${researchImport.marketSlug} - ${researchImport.topic} - ${researchImport.packageVersion} - imported by ${researchImport.researcher} - ${researchImport.importStatus}`}
        icon={ClipboardCheck}
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_340px] lg:p-6">
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Summary</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{researchImport.summary}</CardContent>
          </Card>
          {researchImport.reportMarkdown ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Readable report</CardTitle></CardHeader>
              <CardContent><pre className="whitespace-pre-wrap text-sm text-muted-foreground">{researchImport.reportMarkdown}</pre></CardContent>
            </Card>
          ) : null}
          <Tabs defaultValue="claims">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="claims">Claims</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="questions">Open Questions</TabsTrigger>
              <TabsTrigger value="scores">Score Changes</TabsTrigger>
              <TabsTrigger value="unknowns">Critical Unknowns</TabsTrigger>
              <TabsTrigger value="kills">Kill Criteria</TabsTrigger>
              <TabsTrigger value="win">Why We Win</TabsTrigger>
              <TabsTrigger value="lose">Why We May Lose</TabsTrigger>
              <TabsTrigger value="actions">Next Actions</TabsTrigger>
              <TabsTrigger value="coverage">Coverage</TabsTrigger>
              <TabsTrigger value="decisions">Decision Log</TabsTrigger>
              <TabsTrigger value="reports">Report Updates</TabsTrigger>
            </TabsList>
            <TabsContent value="claims"><ItemSection items={itemsByType("claim")} /></TabsContent>
            <TabsContent value="sources"><ItemSection items={itemsByType("source")} /></TabsContent>
            <TabsContent value="competitors"><ItemSection items={itemsByType("competitor")} /></TabsContent>
            <TabsContent value="assumptions"><ItemSection items={itemsByType("assumption")} /></TabsContent>
            <TabsContent value="risks"><ItemSection items={itemsByType("risk")} /></TabsContent>
            <TabsContent value="questions"><ItemSection items={itemsByType("open_question")} /></TabsContent>
            <TabsContent value="reports"><ItemSection items={itemsByType("report_update")} /></TabsContent>
            <TabsContent value="unknowns"><ItemSection items={itemsByType("critical_unknown")} /></TabsContent>
            <TabsContent value="kills"><ItemSection items={itemsByType("kill_criterion")} /></TabsContent>
            <TabsContent value="win"><ItemSection items={itemsByType("why_we_win")} /></TabsContent>
            <TabsContent value="lose"><ItemSection items={itemsByType("why_we_may_lose")} /></TabsContent>
            <TabsContent value="actions"><ItemSection items={itemsByType("research_action")} /></TabsContent>
            <TabsContent value="coverage"><ItemSection items={itemsByType("coverage_update")} /></TabsContent>
            <TabsContent value="decisions"><ItemSection items={itemsByType("decision_log")} /></TabsContent>
            <TabsContent value="scores">
              <div className="grid gap-3">
                {itemsByType("suggested_score_change").map((item) => (
                  <ScoreChangeCard key={item.id} item={item} scores={researchImport.market?.scores ?? []} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Validation Warnings</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              {warningItems.length === 0 ? <div>No validation or duplicate warnings.</div> : warningItems.map((item) => <div key={item} className="rounded-md border p-2">{item}</div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Review policy</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Imported research remains separate until each item is accepted. Suggested score changes never update active scores unless explicitly approved here.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ItemSection({ items }: { items: { id: string; itemType: string; status: string; externalId: string | null; payload: unknown }[] }) {
  if (items.length === 0) {
    return <Card><CardContent className="pt-6 text-sm text-muted-foreground">No items in this section.</CardContent></Card>;
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const payload = decodeJson<Record<string, unknown>>(item.payload, {});
        return (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                {String(payload.title ?? payload.statement ?? payload.company ?? payload.question ?? payload.id ?? item.externalId)}
                <Badge variant="secondary">{item.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-72 overflow-auto rounded-md border bg-background p-3 text-xs text-muted-foreground">{JSON.stringify(payload, null, 2)}</pre>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <div>Link to Market: reviewed via package market</div>
                <div>Link to Competitor: use competitorIds/sourceIds</div>
                <div>Link to Score Category: {String(payload.category ?? "none")}</div>
              </div>
              <ReviewActions itemId={item.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ScoreChangeCard({ item, scores }: { item: { id: string; status: string; payload: unknown }; scores: { score: number; scoreCategory: { key: string } }[] }) {
  const payload = decodeJson<{ id: string; category: string; suggestedScore: number; currentScore?: number; reason: string; confidence: number; supportingClaimIds: string[]; opposingClaimIds: string[]; sourceIds: string[] }>(
    item.payload,
    { id: "", category: "", suggestedScore: 0, reason: "", confidence: 0, supportingClaimIds: [], opposingClaimIds: [], sourceIds: [] },
  );
  const category = scoringCategories.find((scoreCategory) => scoreCategory.key === payload.category);
  const currentScore = scores.find((score) => score.scoreCategory.key === payload.category)?.score ?? payload.currentScore ?? 0;
  const previousContribution = category ? weightedContribution(currentScore, category.weight) : 0;
  const suggestedContribution = category ? weightedContribution(payload.suggestedScore, category.weight) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
          {category?.label ?? payload.category}
          <Badge variant="secondary">{item.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-4">
          <ScoreBox label="Current score" value={currentScore} />
          <ScoreBox label="Suggested score" value={payload.suggestedScore} />
          <ScoreBox label="Previous weighted" value={previousContribution} />
          <ScoreBox label="Suggested weighted" value={suggestedContribution} />
        </div>
        <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Reason</div>
          <p className="mt-1">{payload.reason}</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div>Supporting claims: {payload.supportingClaimIds.join(", ") || "none"}</div>
            <div>Opposing claims: {payload.opposingClaimIds.join(", ") || "none"}</div>
            <div>Sources: {payload.sourceIds.join(", ") || "none"}</div>
          </div>
          <div className="mt-2">Confidence: {Math.round(payload.confidence * 100)}%</div>
        </div>
        <ReviewActions itemId={item.id} isScoreChange />
      </CardContent>
    </Card>
  );
}

function ScoreBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}
