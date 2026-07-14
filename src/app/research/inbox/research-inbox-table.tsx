"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ImportRow = {
  importId: string;
  packageLabel: string;
  topic: string;
  version: string;
  title: string;
  market: string;
  researchDate: string;
  researcher: string;
  claims: number;
  sources: number;
  competitors: number;
  scoreChanges: number;
  decisionItems: number;
  importStatus: string;
  importedAt: string;
};

export function ResearchInboxTable({ imports }: { imports: ImportRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    return imports.filter((item) => {
      const text = [item.title, item.market, item.researcher, item.importStatus].join(" ").toLowerCase();
      return text.includes(query.toLowerCase()) && (status === "all" || item.importStatus === status);
    });
  }, [imports, query, status]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search imported packages..." />
        <Select value={status} onValueChange={(value) => value && setStatus(value)}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="partially_reviewed">Partially reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Package</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Research Date</TableHead>
              <TableHead>Researcher</TableHead>
              <TableHead>Claims</TableHead>
              <TableHead>Sources</TableHead>
              <TableHead>Competitors</TableHead>
              <TableHead>Suggested Score Changes</TableHead>
              <TableHead>Decision Items</TableHead>
              <TableHead>Import Status</TableHead>
              <TableHead>Imported At</TableHead>
              <TableHead>Next Step</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.importId}>
                <TableCell className="font-mono text-xs"><Link href={`/research/inbox/${item.importId}`}>{item.packageLabel} {item.version}</Link></TableCell>
                <TableCell className="font-medium"><Link href={`/research/inbox/${item.importId}`}>{item.title}</Link></TableCell>
                <TableCell>{item.market}</TableCell>
                <TableCell><Badge variant="outline">{item.topic}</Badge></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{item.researchDate}</TableCell>
                <TableCell>{item.researcher}</TableCell>
                <TableCell className="font-mono">{item.claims}</TableCell>
                <TableCell className="font-mono">{item.sources}</TableCell>
                <TableCell className="font-mono">{item.competitors}</TableCell>
                <TableCell className="font-mono">{item.scoreChanges}</TableCell>
                <TableCell className="font-mono">{item.decisionItems}</TableCell>
                <TableCell><Badge variant="secondary">{item.importStatus}</Badge></TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{item.importedAt}</TableCell>
                <TableCell>
                  <Link className={buttonVariants({ variant: item.importStatus === "pending_review" ? "default" : "outline", size: "sm" })} href={`/research/inbox/${item.importId}`}>
                    {item.importStatus === "approved" ? "View" : "Review"}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
