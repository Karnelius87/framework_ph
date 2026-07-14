"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, BarChart3, BookOpen, Check, ClipboardCopy, ClipboardList, Lightbulb, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type RoadmapCard = {
  id: string;
  title: string;
  subtitle: string;
  source: "market" | "import";
  href: string;
  recommendation?: string;
};

export type RoadmapColumn = {
  key: string;
  title: string;
  cards: RoadmapCard[];
};

const icons = {
  ideas: Lightbulb,
  screening: ClipboardList,
  mini_research: BookOpen,
  deep_research: BarChart3,
  investment_ready: ShieldCheck,
  rejected: Archive,
} as const;

export function RoadmapBoard({ columns }: { columns: RoadmapColumn[] }) {
  const [copied, setCopied] = useState(false);

  async function copyImportInstruction() {
    try {
      await navigator.clipboard.writeText(importInstruction);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = importInstruction;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-3 overflow-x-auto pb-2 lg:auto-cols-[minmax(16rem,1fr)] lg:grid-flow-col">
      {columns.map((column) => {
        const Icon = icons[column.key as keyof typeof icons] ?? ClipboardList;
        return (
          <Card key={column.key} className="min-w-64 rounded-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Icon className="size-4" />
                {column.title}
                <span className="ml-auto font-mono text-xs text-muted-foreground">{column.cards.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {column.cards.map((card) => (
                <div key={card.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={card.href} className="block truncate text-sm font-medium text-primary">{card.title}</Link>
                      <div className="mt-1 text-xs text-muted-foreground">{card.subtitle}</div>
                    </div>
                    <Badge variant={card.source === "market" ? "secondary" : "outline"}>{card.source === "market" ? "Market" : "Import"}</Badge>
                  </div>
                  {card.recommendation ? <div className="mt-2 text-xs text-muted-foreground">{card.recommendation}</div> : null}
                </div>
              ))}
              {column.cards.length === 0 ? (
                <div className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
                  Empty
                </div>
              ) : null}
              {column.key === "ideas" ? (
                <div className="mt-1 grid gap-2">
                  <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/import">Import idea</Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    aria-label="Copy import instruction"
                    onClick={copyImportInstruction}
                  >
                    {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
                    {copied ? "Copied" : "Copy prompt"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const importInstruction = `Return one White Space OS research package as valid JSON.
Use importVersion "2.0".
If this is a new idea not yet in the portal, set marketSlug to a lowercase slug for the idea.
Include: title, summary, researcher, researchDate, topic, claims, sources, risks, openQuestions, criticalUnknowns, nextResearchActions.
Do not include unsupported facts as verified claims. Mark uncertain items as needs_review or hypothesis.`;
