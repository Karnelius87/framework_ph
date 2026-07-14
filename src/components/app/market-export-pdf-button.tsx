"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketExportPdfButton() {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()} data-print-hidden="true">
      <FileDown data-icon="inline-start" />
      Export PDF
    </Button>
  );
}
