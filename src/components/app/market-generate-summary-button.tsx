"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketGenerateSummaryButton({
  summaryText,
  targetId,
}: {
  summaryText: string;
  targetId: string;
}) {
  const [ready, setReady] = useState(false);

  async function generateSummary() {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      await navigator.clipboard.writeText(summaryText);
    } catch {
      // Clipboard access can be blocked on localhost; the visible summary is still generated.
    }

    setReady(true);
    window.setTimeout(() => setReady(false), 2400);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={generateSummary} data-print-hidden="true">
      <Sparkles data-icon="inline-start" />
      {ready ? "Summary ready" : "Generate Summary"}
    </Button>
  );
}
