"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  href: string;
  description?: string;
};

type ExplainableMetricProps = {
  label: string;
  value: string | number;
  definition?: string;
  formula?: string;
  explanation: string;
  detail?: string;
  currentValueLabel?: string;
  linkedClaims?: string[];
  opposingClaims?: string[];
  supportingEvidence?: string[];
  opposingEvidence?: string[];
  linkedSources?: string[];
  linkedCompetitors?: string[];
  linkedInterviews?: string[];
  confidence?: number;
  history?: { label: string; value: string | number }[];
  openQuestions?: string[];
  criticalUnknowns?: string[];
  gaps?: string[];
  missingEvidence?: string[];
  lastUpdated?: string;
  navigation?: NavigationItem[];
  href?: string;
  intelligenceHref?: string;
  valueClassName?: string;
  indicatorClassName?: string;
  variant?: "card" | "inline";
  className?: string;
};

export function ExplainableMetric({
  label,
  value,
  definition,
  formula,
  explanation,
  detail,
  currentValueLabel = "Current value",
  linkedClaims = [],
  opposingClaims = [],
  supportingEvidence = [],
  opposingEvidence = [],
  linkedSources = [],
  linkedCompetitors = [],
  linkedInterviews = [],
  confidence,
  history = [],
  openQuestions = [],
  criticalUnknowns = [],
  gaps = [],
  missingEvidence = [],
  lastUpdated,
  navigation = [],
  href,
  intelligenceHref,
  valueClassName,
  indicatorClassName,
  variant = "card",
  className,
}: ExplainableMetricProps) {
  return (
    <Sheet>
      <SheetTrigger render={<button className="group w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" />}>
        {variant === "inline" ? (
          <span className={cn("inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 font-mono text-sm hover:bg-muted", className)}>
            {indicatorClassName ? <span className={cn("size-2 rounded-full", indicatorClassName)} /> : null}
            <span className={cn("truncate", valueClassName)}>{value}</span>
            <Info className="size-3 shrink-0 text-muted-foreground" />
          </span>
        ) : (
          <div className={cn("rounded-md border bg-background p-3 transition-colors group-hover:bg-muted/40", className)}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
              <div className="flex items-center gap-2">
                {indicatorClassName ? <span className={cn("size-2 rounded-full", indicatorClassName)} /> : null}
                <Info className="size-4 text-muted-foreground" />
              </div>
            </div>
            <div className={cn("mt-1 text-xl font-semibold leading-tight", valueClassName)}>{value}</div>
            {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
            {confidence !== undefined ? <div className="mt-1 text-xs text-muted-foreground">{confidence}% confidence</div> : null}
          </div>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-hidden border-l border-border bg-card shadow-2xl sm:max-w-xl xl:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>Metric definition, formula, evidence, history, gaps, and navigation trail.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid gap-4 text-sm">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{currentValueLabel}</div>
              <div className={cn("mt-1 font-mono text-2xl font-semibold", valueClassName)}>{value}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {confidence !== undefined ? <Badge variant="secondary">{confidence}% confidence</Badge> : null}
                {lastUpdated ? <Badge variant="outline">Updated {lastUpdated}</Badge> : null}
              </div>
            </div>

            <TextBlock title="Metric Definition" body={definition ?? explanation} />
            {formula ? <CodeBlock title="Formula" body={formula} /> : null}
            <TextBlock title="Explanation" body={explanation} />

            <div className="grid gap-3 md:grid-cols-2">
              <DetailList title="Supporting Claims" items={linkedClaims} empty="No linked supporting claims." />
              <DetailList title="Opposing Claims" items={opposingClaims} empty="No linked opposing claims." />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailList title="Supporting Evidence" items={supportingEvidence} empty="No supporting evidence listed." />
              <DetailList title="Opposing Evidence" items={opposingEvidence} empty="No opposing evidence listed." />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailList title="Linked Sources" items={linkedSources} empty="No linked sources." />
              <DetailList title="Linked Competitors" items={linkedCompetitors} empty="No linked competitors." />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailList title="Linked Interviews" items={linkedInterviews} empty="No linked interviews." />
              <DetailList title="Open Questions" items={openQuestions} empty="No open questions." />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailList title="Critical Unknowns" items={criticalUnknowns} empty="No critical unknowns." />
              <DetailList title="Missing Evidence" items={[...gaps, ...missingEvidence]} empty="No missing evidence recorded." />
            </div>

            <div>
              <div className="font-medium">Historical Values</div>
              <div className="mt-2 flex flex-col gap-2">
                {history.length === 0 ? <div className="text-muted-foreground">No historical values yet.</div> : history.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="flex items-center justify-between rounded-md border bg-background p-2">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {navigation.length || href || intelligenceHref ? (
              <div>
                <div className="font-medium">Navigation</div>
                <div className="mt-2 grid gap-2">
                  {intelligenceHref ? (
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={intelligenceHref}>
                      Open in Intelligence Graph <ArrowRight className="size-4" />
                    </Link>
                  ) : null}
                  {navigation.map((item) => (
                    <Link key={item.href} href={item.href} className="rounded-md border bg-background p-3 transition-colors hover:bg-accent">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{item.label}</span>
                        <ArrowRight className="size-4 text-muted-foreground" />
                      </div>
                      {item.description ? <p className="mt-1 text-muted-foreground">{item.description}</p> : null}
                    </Link>
                  ))}
                  {href ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={href}>Open detail page</Link> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}

function CodeBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      <pre className="mt-2 whitespace-pre-wrap rounded-md border bg-background p-3 text-xs text-muted-foreground">{body}</pre>
    </div>
  );
}

function DetailList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length === 0 ? <span className="text-muted-foreground">{empty}</span> : items.map((item, index) => (
          <span key={`${item}-${index}`} className="max-w-full break-words rounded-md border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{item}</span>
        ))}
      </div>
    </div>
  );
}
