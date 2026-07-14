"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Circle, ListFilter, Loader2, Play, Search } from "lucide-react";
import { updateResearchActionStatusAction } from "@/app/research/actions/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ResearchActionRow = {
  id: string;
  marketSlug: string;
  marketName: string;
  title: string;
  description: string;
  priority: string;
  reason: string;
  status: string;
  linkedCoverageCategory: string | null;
  estimatedImpact: number;
  expectedConfidenceImprovement: number;
  dueDate: string | null;
  completedAt: string | null;
};

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
];

const priorityRank: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2 };

export function ResearchActionsClient({ rows }: { rows: ResearchActionRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(rows);
  const [market, setMarket] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const markets = useMemo(() => Array.from(new Map(items.map((item) => [item.marketSlug, item.marketName])).entries()), [items]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => market === "all" || item.marketSlug === market)
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => !query || `${item.title} ${item.description} ${item.reason} ${item.marketName}`.toLowerCase().includes(query))
      .sort((a, b) => (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0) || b.estimatedImpact - a.estimatedImpact);
  }, [items, market, search, status]);

  const activeItems = items.filter((item) => !["completed", "dismissed"].includes(item.status));
  const totalDecisionImpact = Math.round(activeItems.reduce((sum, item) => sum + item.estimatedImpact, 0));
  const totalConfidenceLift = Math.round(activeItems.reduce((sum, item) => sum + item.expectedConfidenceImprovement, 0));

  function updateStatus(actionId: string, nextStatus: string) {
    startTransition(async () => {
      const result = await updateResearchActionStatusAction(actionId, nextStatus);
      if (!result.success) return;
      setItems((current) => current.map((item) => item.id === actionId ? { ...item, status: result.action.status, completedAt: result.action.completedAt } : item));
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile label="Open actions" value={activeItems.length} />
        <SummaryTile label="Filtered" value={filtered.length} />
        <SummaryTile label="Decision impact" value={totalDecisionImpact} />
        <SummaryTile label="Confidence lift" value={`+${totalConfidenceLift}`} />
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search actions, reasons, markets..." className="pl-9" />
          </div>
          <Select value={market} onValueChange={(value) => value && setMarket(value)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All markets</SelectItem>
              {markets.map(([slug, name]) => <SelectItem key={slug} value={slug}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => value && setStatus(value)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
              <ListFilter className="size-4" />
              No actions match the current filters.
            </CardContent>
          </Card>
        ) : filtered.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-sm">{item.title}</CardTitle>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="secondary">{item.priority}</Badge>
                  <StatusBadge status={item.status} />
                  {item.linkedCoverageCategory ? <Badge variant="outline">{item.linkedCoverageCategory}</Badge> : null}
                  {item.dueDate ? <Badge variant="outline">Due {item.dueDate}</Badge> : null}
                </div>
              </div>
              <Link href={`/markets/${item.marketSlug}`} className="text-sm font-medium text-primary">{item.marketName}</Link>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <Metric label="Reason" value={item.reason} />
                <Metric label="Decision impact" value={String(item.estimatedImpact)} />
                <Metric label="Confidence lift" value={`+${item.expectedConfidenceImprovement}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => updateStatus(item.id, "planned")}><Circle data-icon="inline-start" />Plan</Button>
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => updateStatus(item.id, "in_progress")}><Play data-icon="inline-start" />Start</Button>
                <Button size="sm" disabled={isPending} onClick={() => updateStatus(item.id, "completed")}>{isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <CheckCircle2 data-icon="inline-start" />}Complete</Button>
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => updateStatus(item.id, "blocked")}><Ban data-icon="inline-start" />Block</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed" ? "default" : status === "blocked" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
