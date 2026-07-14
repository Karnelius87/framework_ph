"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clipboard, Download, WandSparkles } from "lucide-react";
import { buildResearchPrompt, researchPromptTopics, type ResearchPromptDepth, type ResearchPromptLanguage, type ResearchPromptMarket, type ResearchPromptTopicKey } from "@/lib/research/prompt-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type PromptBuilderClientProps = {
  markets: ResearchPromptMarket[];
};

const depths: { key: ResearchPromptDepth; label: string; description: string }[] = [
  { key: "quick", label: "Quick", description: "Fast scan for directional signal." },
  { key: "standard", label: "Standard", description: "Decision-quality research package." },
  { key: "deep", label: "Deep", description: "Diligence pass with stronger evidence demands." },
];

const today = new Date().toISOString().slice(0, 10);

export function PromptBuilderClient({ markets }: PromptBuilderClientProps) {
  const [marketSlug, setMarketSlug] = useState(markets[0]?.slug ?? "workshop");
  const [topicKey, setTopicKey] = useState<ResearchPromptTopicKey>("investment_decision");
  const [depth, setDepth] = useState<ResearchPromptDepth>("standard");
  const [language, setLanguage] = useState<ResearchPromptLanguage>("english");
  const [customFocus, setCustomFocus] = useState("");
  const [copied, setCopied] = useState(false);

  const market = useMemo(() => markets.find((item) => item.slug === marketSlug) ?? markets[0], [marketSlug, markets]);
  const selectedTopic = researchPromptTopics.find((item) => item.key === topicKey) ?? researchPromptTopics[0];
  const prompt = useMemo(() => buildResearchPrompt({
    market,
    topicKey,
    depth,
    language,
    customFocus,
    researchDate: today,
  }), [customFocus, depth, language, market, topicKey]);

  function copyPrompt() {
    let textarea: HTMLTextAreaElement | null = null;
    try {
      textarea = document.createElement("textarea");
      textarea.value = prompt;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
    } catch {
      // Some automated browsers block legacy copy commands. Keep UI responsive.
    } finally {
      textarea?.remove();
    }

    try {
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(prompt).catch(() => undefined);
      }
    } catch {
      // Clipboard policy can differ across browser contexts.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadPrompt() {
    const blob = new Blob([prompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${market.slug}-${topicKey}-research-prompt.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <WandSparkles className="size-4" />
            Prompt controls
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Control label="Market">
            <Select value={marketSlug} onValueChange={(value) => value && setMarketSlug(value)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {markets.map((item) => <SelectItem key={item.slug} value={item.slug}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Control>
          <Control label="Research type">
            <Select value={topicKey} onValueChange={(value) => value && setTopicKey(value as ResearchPromptTopicKey)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {researchPromptTopics.map((item) => <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Control>
          <Control label="Depth">
            <div className="grid grid-cols-3 gap-2">
              {depths.map((item) => (
                <Button key={item.key} type="button" variant={depth === item.key ? "default" : "outline"} onClick={() => setDepth(item.key)}>
                  {item.label}
                </Button>
              ))}
            </div>
          </Control>
          <Control label="Language">
            <Select value={language} onValueChange={(value) => value && setLanguage(value as ResearchPromptLanguage)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English output</SelectItem>
                <SelectItem value="swedish">Swedish output</SelectItem>
              </SelectContent>
            </Select>
          </Control>
          <Control label="Extra focus">
            <Textarea
              value={customFocus}
              onChange={(event) => setCustomFocus(event.target.value)}
              placeholder="Example: focus on payment willingness among independent workshop owners."
              className="min-h-24 text-sm"
            />
          </Control>
          <div className="rounded-md border bg-background p-3 text-sm">
            <div className="font-medium">{market.name}</div>
            <p className="mt-1 text-muted-foreground">{market.summary}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              <Badge variant="secondary">Score {market.score}</Badge>
              <Badge variant="secondary">Confidence {market.confidence}%</Badge>
              <Badge variant="outline">{selectedTopic.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm">Copy-ready ChatGPT prompt</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadPrompt}><Download data-icon="inline-start" />Download</Button>
            <Button onClick={copyPrompt}>{copied ? <CheckCircle2 data-icon="inline-start" /> : <Clipboard data-icon="inline-start" />}{copied ? "Copied" : "Copy prompt"}</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea value={prompt} readOnly className="min-h-[620px] font-mono text-xs leading-relaxed" />
        </CardContent>
      </Card>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
