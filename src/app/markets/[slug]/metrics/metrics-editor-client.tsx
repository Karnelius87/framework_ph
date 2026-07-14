"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { saveStrategicMetricsAction, type StrategicMetricsPayload } from "@/app/markets/[slug]/metrics/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MetricsEditorClientProps = {
  slug: string;
  marketName: string;
  initialMetrics: StrategicMetricsPayload;
  initialDecisionScore: number;
};

type NumericField<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

const founderFields: { key: NumericField<StrategicMetricsPayload["founderFit"]>; label: string }[] = [
  { key: "score", label: "Founder Fit Score" },
  { key: "domainKnowledge", label: "Domain Knowledge" },
  { key: "localAccess", label: "Local Access" },
  { key: "technicalCapability", label: "Technical Capability" },
  { key: "salesCapability", label: "Sales Capability" },
  { key: "distributionAccess", label: "Distribution Access" },
  { key: "capitalRequirementFit", label: "Capital Requirement Fit" },
  { key: "operationalFit", label: "Operational Fit" },
];

const executionFields: { key: NumericField<StrategicMetricsPayload["executionReadiness"]>; label: string }[] = [
  { key: "score", label: "Execution Score" },
  { key: "customerAccess", label: "Customer Access" },
  { key: "prototypeReadiness", label: "Prototype Readiness" },
  { key: "regulatoryReadiness", label: "Regulatory Readiness" },
  { key: "dataAvailability", label: "Data Availability" },
  { key: "integrationComplexity", label: "Integration Complexity" },
  { key: "onboardingComplexity", label: "Onboarding Complexity" },
  { key: "timeToMvp", label: "Time to MVP" },
  { key: "costToValidate", label: "Cost to Validate" },
];

const leadershipFields: { key: NumericField<StrategicMetricsPayload["leadership"]>; label: string }[] = [
  { key: "chance", label: "Chance of Becoming #1" },
  { key: "competitiveIntensity", label: "Competitive Intensity" },
  { key: "marketFragmentation", label: "Market Fragmentation" },
  { key: "incumbentStrength", label: "Incumbent Strength" },
  { key: "localizationAdvantage", label: "Localization Advantage" },
  { key: "distributionDifficulty", label: "Distribution Difficulty" },
  { key: "switchingBarriers", label: "Switching Barriers" },
  { key: "speedAdvantage", label: "Speed Advantage" },
];

export function MetricsEditorClient({ slug, marketName, initialMetrics, initialDecisionScore }: MetricsEditorClientProps) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [decisionScore, setDecisionScore] = useState(Math.round(initialDecisionScore));
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveStrategicMetricsAction(slug, metrics);
      if (!result.success) {
        setStatus("error");
        setError(result.error);
        return;
      }
      setDecisionScore(result.decisionScore ?? decisionScore);
      setStatus("saved");
      setError("");
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile label="Market" value={marketName} />
        <SummaryTile label="Decision Score" value={decisionScore} />
        <SummaryTile label="Founder Fit" value={Math.round(metrics.founderFit.score)} />
        <SummaryTile label="#1 Chance" value={`${Math.round(metrics.leadership.chance)}%`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={isPending}>
          {isPending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}
          Save and Recalculate
        </Button>
        {status === "saved" ? <Badge><CheckCircle2 data-icon="inline-start" />Saved</Badge> : null}
        {status === "error" ? <Badge variant="destructive">{error}</Badge> : null}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <MetricSection
          title="Founder Fit"
          description="How naturally this market matches the founder, local access, sales motion, and capital constraints."
          fields={founderFields}
          values={metrics.founderFit}
          onNumberChange={(key, value) => setMetrics((current) => ({ ...current, founderFit: { ...current.founderFit, [key]: value } }))}
          onExplanationChange={(value) => setMetrics((current) => ({ ...current, founderFit: { ...current.founderFit, explanation: value } }))}
        />
        <MetricSection
          title="Execution Readiness"
          description="How quickly and cheaply the thesis can move from research to a credible MVP and validation loop."
          fields={executionFields}
          values={metrics.executionReadiness}
          onNumberChange={(key, value) => setMetrics((current) => ({ ...current, executionReadiness: { ...current.executionReadiness, [key]: value } }))}
          onExplanationChange={(value) => setMetrics((current) => ({ ...current, executionReadiness: { ...current.executionReadiness, explanation: value } }))}
        />
        <MetricSection
          title="Market Leadership"
          description="Whether this market has a realistic path to a local category-leading position."
          fields={leadershipFields}
          values={metrics.leadership}
          onNumberChange={(key, value) => setMetrics((current) => ({ ...current, leadership: { ...current.leadership, [key]: value } }))}
          onExplanationChange={(value) => setMetrics((current) => ({ ...current, leadership: { ...current.leadership, explanation: value } }))}
        />
      </div>
    </div>
  );
}

function MetricSection<T extends { explanation: string }>({
  title,
  description,
  fields,
  values,
  onNumberChange,
  onExplanationChange,
}: {
  title: string;
  description: string;
  fields: { key: NumericField<T>; label: string }[];
  values: T;
  onNumberChange: (key: NumericField<T>, value: number) => void;
  onExplanationChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {fields.map((field) => (
          <label key={String(field.key)} className="grid gap-1 text-sm">
            <span className="text-muted-foreground">{field.label}</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={String(values[field.key] ?? 0)}
              onChange={(event) => onNumberChange(field.key, Number(event.target.value))}
            />
          </label>
        ))}
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Explanation</span>
          <Textarea value={String(values.explanation ?? "")} onChange={(event) => onExplanationChange(event.target.value)} className="min-h-24 text-sm" />
        </label>
      </CardContent>
    </Card>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-2xl font-semibold">{value}</div>
    </div>
  );
}
