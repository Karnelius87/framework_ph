"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Clipboard, Download, FileJson, Search, Trash2, Upload } from "lucide-react";
import { detectResearchPackages, type DetectedJsonBlock } from "@/lib/research/parser";
import { importTemplate, researchPackageSchema, type ResearchPackage } from "@/lib/research/schema";
import { saveImportPackageAction, validateImportPackageAction } from "@/app/research/import/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ServerValidation = Awaited<ReturnType<typeof validateImportPackageAction>>;
type SaveResult = Awaited<ReturnType<typeof saveImportPackageAction>>;

export function ResearchImportClient() {
  const [rawText, setRawText] = useState("");
  const [blocks, setBlocks] = useState<DetectedJsonBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ServerValidation | null>(null);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedBlockId) ?? blocks[0], [blocks, selectedBlockId]);
  const selectedPackage = selectedBlock?.validPackage;

  function detect() {
    const detected = detectResearchPackages(rawText);
    setBlocks(detected);
    setSelectedBlockId(detected[0]?.id ?? null);
    setValidation(null);
    setSaveResult(null);
  }

  function validate() {
    if (!selectedBlock?.parsed) return;
    startTransition(async () => {
      setValidation(await validateImportPackageAction(selectedBlock.parsed));
      setSaveResult(null);
    });
  }

  function save() {
    if (!selectedBlock?.parsed) return;
    startTransition(async () => {
      const result = await saveImportPackageAction(selectedBlock.parsed);
      setSaveResult(result);
    });
  }

  async function pasteFromClipboard() {
    const text = await navigator.clipboard.readText();
    setRawText(text);
    setBlocks([]);
    setValidation(null);
    setSaveResult(null);
  }

  function uploadJson(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawText(String(reader.result ?? ""));
      setBlocks([]);
      setValidation(null);
      setSaveResult(null);
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([JSON.stringify(importTemplate, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "research-import-template.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function clear() {
    setRawText("");
    setBlocks([]);
    setSelectedBlockId(null);
    setValidation(null);
    setSaveResult(null);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Paste ChatGPT research or JSON</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Paste a full ChatGPT answer, a fenced JSON block, or raw JSON research package..."
              className="min-h-[360px] font-mono text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex">
                <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => uploadJson(event.target.files?.[0])} />
                <span className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm font-medium hover:bg-muted">
                  <Upload className="size-4" />
                  Upload JSON
                </span>
              </label>
              <Button variant="outline" onClick={pasteFromClipboard}><Clipboard data-icon="inline-start" />Paste from Clipboard</Button>
              <Button onClick={detect}><Search data-icon="inline-start" />Detect Research Package</Button>
              <Button variant="outline" onClick={validate} disabled={!selectedBlock?.parsed || isPending}><CheckCircle2 data-icon="inline-start" />Validate</Button>
              <Button variant="outline" onClick={() => setValidation(validation)} disabled={!selectedPackage}>Preview Import</Button>
              <Button onClick={save} disabled={!validation?.success || isPending}>Save to Research Inbox</Button>
              <Button variant="outline" onClick={downloadTemplate}><Download data-icon="inline-start" />Download Import Template</Button>
              <Button variant="outline" onClick={clear}><Trash2 data-icon="inline-start" />Clear</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Detected JSON blocks</CardTitle>
          </CardHeader>
          <CardContent>
            {blocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No valid research package was detected. Paste a complete JSON package or a ChatGPT answer containing a Research Package JSON block.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Use</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block) => (
                    <TableRow key={block.id}>
                      <TableCell>
                        <Button variant={selectedBlock?.id === block.id ? "default" : "outline"} size="sm" onClick={() => setSelectedBlockId(block.id)}>Select</Button>
                      </TableCell>
                      <TableCell>{block.label}</TableCell>
                      <TableCell>{block.validPackage ? <Badge>Valid schema</Badge> : <Badge variant="secondary">Needs fixes</Badge>}</TableCell>
                      <TableCell className="max-w-xl text-xs text-muted-foreground">{block.errors.slice(0, 3).join("; ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid content-start gap-4">
        <ImportPreview pkg={selectedPackage} />
        <ValidationPanel validation={validation} saveResult={saveResult} />
      </div>
    </div>
  );
}

function ImportPreview({ pkg }: { pkg?: ResearchPackage }) {
  if (!pkg) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Select a valid detected package to preview its contents.</CardContent>
      </Card>
    );
  }

  const result = researchPackageSchema.safeParse(pkg);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><FileJson className="size-4" />Preview Import</CardTitle></CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div><div className="text-muted-foreground">Title</div><div className="font-medium">{pkg.title}</div></div>
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-muted-foreground">Market</div><Badge variant="secondary">{pkg.marketSlug}</Badge></div>
          <div><div className="text-muted-foreground">Version</div><div>{pkg.importVersion} / {pkg.version}</div></div>
          <div><div className="text-muted-foreground">Topic</div><Badge variant="outline">{pkg.topic}</Badge></div>
          <div><div className="text-muted-foreground">Researcher</div><div>{pkg.researcher}</div></div>
          <div><div className="text-muted-foreground">Claims</div><div className="font-mono">{pkg.claims.length}</div></div>
          <div><div className="text-muted-foreground">Sources</div><div className="font-mono">{pkg.sources.length}</div></div>
          <div><div className="text-muted-foreground">Competitors</div><div className="font-mono">{pkg.competitors.length}</div></div>
          <div><div className="text-muted-foreground">Score Changes</div><div className="font-mono">{pkg.suggestedScoreChanges.length}</div></div>
          <div><div className="text-muted-foreground">Unknowns</div><div className="font-mono">{pkg.criticalUnknowns.length}</div></div>
          <div><div className="text-muted-foreground">Kill Criteria</div><div className="font-mono">{pkg.killCriteria.length}</div></div>
          <div><div className="text-muted-foreground">Coverage Updates</div><div className="font-mono">{pkg.coverageUpdates.length}</div></div>
          <div><div className="text-muted-foreground">Decision Logs</div><div className="font-mono">{pkg.decisionLogEntries.length}</div></div>
          <div><div className="text-muted-foreground">Product Strategy</div><div>{pkg.productStrategy ? "Included" : "None"}</div></div>
        </div>
        <p className="text-muted-foreground">{pkg.summary}</p>
        {!result.success ? <div className="rounded-md border p-3 text-xs text-destructive">{result.error.message}</div> : null}
      </CardContent>
    </Card>
  );
}

function ValidationPanel({ validation, saveResult }: { validation: ServerValidation | null; saveResult: SaveResult | null }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Validation and save state</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {!validation ? <p className="text-muted-foreground">Run validation before saving to the Research Inbox.</p> : null}
        {validation ? <StatusBlock title={validation.success ? "Validation passed" : "Validation failed"} items={[...validation.errors, ...validation.warnings, ...validation.duplicateWarnings]} /> : null}
        {saveResult ? (
          <div className="rounded-md border p-3">
            <div className="font-medium">{saveResult.success ? "Saved to Research Inbox" : "Save failed"}</div>
            {saveResult.success ? <Link className="mt-2 inline-block text-primary" href={`/research/inbox/${saveResult.importId}`}>Open review page</Link> : null}
            <StatusBlock title="Messages" items={[...saveResult.errors, ...saveResult.warnings, ...saveResult.duplicateWarnings]} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border p-3">
      <div className="font-medium">{title}</div>
      {items.length === 0 ? (
        <div className="mt-1 text-muted-foreground">No warnings.</div>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
