"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DecisionRow = {
  id: string;
  market: string;
  marketSlug: string;
  title: string;
  decision: string;
  decisionType: string;
  approvedBy: string;
  approvedAt: string;
  reversible: boolean;
};

export function DecisionLogClient({ rows }: { rows: DecisionRow[] }) {
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("all");
  const [type, setType] = useState("all");
  const [reversible, setReversible] = useState("all");

  const markets = Array.from(new Set(rows.map((row) => row.marketSlug))).sort();
  const types = Array.from(new Set(rows.map((row) => row.decisionType))).sort();

  const filtered = useMemo(() => rows.filter((row) => {
    const text = [row.market, row.title, row.decision, row.approvedBy, row.approvedAt].join(" ").toLowerCase();
    return text.includes(query.toLowerCase())
      && (market === "all" || row.marketSlug === market)
      && (type === "all" || row.decisionType === type)
      && (reversible === "all" || String(row.reversible) === reversible);
  }), [rows, query, market, type, reversible]);

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-4">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by date, approver, title..." />
        <Select value={market} onValueChange={(value) => value && setMarket(value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All markets</SelectItem>
            {markets.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(value) => value && setType(value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All decision types</SelectItem>
            {types.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={reversible} onValueChange={(value) => value && setReversible(value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reversibility</SelectItem>
            <SelectItem value="true">Reversible</SelectItem>
            <SelectItem value="false">Not reversible</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Approver</TableHead>
              <TableHead>Reversible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.approvedAt}</TableCell>
                <TableCell><Link href={`/markets/${row.marketSlug}`}>{row.market}</Link></TableCell>
                <TableCell><div className="font-medium">{row.title}</div><div className="text-xs text-muted-foreground">{row.decision}</div></TableCell>
                <TableCell><Badge variant="secondary">{row.decisionType}</Badge></TableCell>
                <TableCell>{row.approvedBy}</TableCell>
                <TableCell><Badge variant="outline">{row.reversible ? "Yes" : "No"}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
