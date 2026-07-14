"use client";

import type { ElementType } from "react";
import { useTransition } from "react";
import { DatabaseBackup, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import {
  clearDemoDataAction,
  exportAllResearchAction,
  exportBackupAction,
  exportClaimsAction,
  exportMarketAction,
  exportSourcesAction,
  importBackupAction,
  resetLocalDatabaseAction,
} from "@/app/settings/data/actions";
import { markets } from "@/data/research";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DataSettingsClient() {
  const [isPending, startTransition] = useTransition();

  function download(name: string, value: unknown) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function runExport(name: string, action: () => Promise<unknown>) {
    startTransition(async () => download(name, await action()));
  }

  function destructive(message: string, action: () => Promise<unknown>) {
    if (!window.confirm(message)) return;
    startTransition(async () => {
      await action();
      window.location.reload();
    });
  }

  function importBackup(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        const result = await importBackupAction(JSON.parse(String(reader.result ?? "{}")));
        alert(result.message);
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <DataCard title="Export All Research as JSON" description="Full research export with markets, scores, claims, sources, imports, and timeline." onClick={() => runExport("all-research.json", exportAllResearchAction)} icon={Download} disabled={isPending} />
      <DataCard title="Export Selected Market as JSON" description="Exports the current top-ranked demo market package." onClick={() => runExport("market-workshop.json", () => exportMarketAction(markets[0].slug))} icon={Download} disabled={isPending} />
      <DataCard title="Export Sources as JSON" description="Exports sources with claim relations." onClick={() => runExport("sources.json", exportSourcesAction)} icon={Download} disabled={isPending} />
      <DataCard title="Export Claims as JSON" description="Exports claims with evidence and category links." onClick={() => runExport("claims.json", exportClaimsAction)} icon={Download} disabled={isPending} />
      <DataCard title="Export Backup" description="Backup export containing all local research tables." onClick={() => runExport("white-space-backup.json", exportBackupAction)} icon={DatabaseBackup} disabled={isPending} />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Upload className="size-4" />Import Backup</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Loads a local backup file into a reviewed restore workflow. Raw SQLite is never exposed.</p>
          <label className="inline-flex">
            <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => importBackup(event.target.files?.[0])} />
            <span className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-input bg-background px-2.5 text-sm font-medium hover:bg-muted">Choose backup file</span>
          </label>
        </CardContent>
      </Card>
      <DataCard title="Clear Demo Data" description="Deletes seeded demo markets and scores after confirmation." onClick={() => destructive("Clear seeded demo data? Approved imported research may remain orphaned.", clearDemoDataAction)} icon={Trash2} disabled={isPending} />
      <DataCard title="Reset Local Database" description="Deletes all local research data after confirmation." onClick={() => destructive("Reset the local database? This cannot be undone unless you have an exported backup.", resetLocalDatabaseAction)} icon={RotateCcw} disabled={isPending} />
    </div>
  );
}

function DataCard({ title, description, onClick, icon: Icon, disabled }: { title: string; description: string; onClick: () => void; icon: ElementType; disabled?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Icon className="size-4" />{title}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button variant="outline" onClick={onClick} disabled={disabled}>Run</Button>
      </CardContent>
    </Card>
  );
}
