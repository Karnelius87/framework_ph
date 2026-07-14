import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, CircleAlert, Lightbulb, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "good" | "watch" | "risk" | "neutral";

function toneClasses(tone: Tone) {
  if (tone === "good") return "border-emerald-500/30 bg-emerald-500/10";
  if (tone === "watch") return "border-amber-500/30 bg-amber-500/10";
  if (tone === "risk") return "border-destructive/40 bg-destructive/10";
  return "bg-card";
}

export function RecommendationCard({
  title = "Current Recommendation",
  recommendation,
  score,
  confidence,
  nextAction,
  href,
}: {
  title?: string;
  recommendation: string;
  score?: number;
  confidence?: number;
  nextAction?: string;
  href?: string;
}) {
  const tone: Tone = recommendation.toLowerCase().includes("build")
    ? "good"
    : recommendation.toLowerCase().includes("reject") || recommendation.toLowerCase().includes("archive")
      ? "risk"
      : "watch";

  return (
    <Card className={cn("rounded-md", toneClasses(tone))}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span>{title}</span>
          <Badge variant={tone === "risk" ? "destructive" : "secondary"}>{recommendation}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          {score !== undefined ? <DecisionCard label="Decision Score" value={Math.round(score)} tone={score >= 75 ? "good" : score >= 60 ? "watch" : "risk"} /> : null}
          {confidence !== undefined ? <DecisionCard label="Confidence" value={`${Math.round(confidence)}%`} tone={confidence >= 70 ? "good" : confidence >= 55 ? "watch" : "risk"} /> : null}
        </div>
        {nextAction ? <ResearchActionCard title="Next Action" action={nextAction} /> : null}
        {href ? (
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={href}>
            Open detail <ArrowRight data-icon="inline-end" />
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function DecisionCard({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: Tone }) {
  return (
    <div className={cn("rounded-md border p-3", toneClasses(tone))}>
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold">{value}</div>
    </div>
  );
}

export function CoverageCard({ label, value, target, detail }: { label: string; value: number; target?: number; detail?: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono">{Math.round(value)}%{target !== undefined ? ` / ${Math.round(target)}%` : ""}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {detail ? <div className="mt-2 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

export function ResearchActionCard({ title, action, priority }: { title?: string; action: string; priority?: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="size-4 text-primary" />
        {title ?? "Research Action"}
        {priority ? <Badge variant="outline">{priority}</Badge> : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{action}</p>
    </div>
  );
}

export function UnknownCard({ title, detail, severity = "watch" }: { title: string; detail?: string; severity?: Tone }) {
  return (
    <div className={cn("rounded-md border p-3", toneClasses(severity))}>
      <div className="flex items-center gap-2 text-sm font-medium">
        {severity === "risk" ? <ShieldAlert className="size-4" /> : <CircleAlert className="size-4" />}
        {title}
      </div>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function EvidenceCard({ title, items, icon: Icon = CheckCircle2 }: { title: string; items: string[]; icon?: LucideIcon }) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><Icon className="size-4" />{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        {items.slice(0, 5).map((item) => <div key={item}>{item}</div>)}
        {items.length === 0 ? <div>No structured items yet.</div> : null}
      </CardContent>
    </Card>
  );
}

export function AdvancedDisclosure({ title = "Advanced", children, defaultOpen = false }: { title?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-md border bg-card" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium">
        {title}
        <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
        <span className="hidden text-xs text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}
