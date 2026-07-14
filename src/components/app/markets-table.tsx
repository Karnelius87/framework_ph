"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { Market } from "@/data/research";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type MarketRow = Market & { decisionScore?: number; totalMarketScore?: number; killCriteriaStatus?: string };

export function MarketsTable({ markets }: { markets: MarketRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    return markets
      .filter((market) => {
        const text = [market.name, market.status, market.recommendation, market.tags.join(" ")].join(" ").toLowerCase();
        const matchesQuery = text.includes(query.toLowerCase());
        const matchesStatus = status === "all" || market.status === status;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));
  }, [markets, query, sortDesc, status]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search markets or tags..." />
        <Select value={status} onValueChange={(value) => value && setStatus(value)}>
          <SelectTrigger className="md:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Deep Research">Deep Research</SelectItem>
            <SelectItem value="Mini Research">Mini Research</SelectItem>
            <SelectItem value="Screening">Screening</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setSortDesc((value) => !value)}>
          <ArrowUpDown data-icon="inline-start" />
          Score
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Overall Score</TableHead>
              <TableHead className="text-right">Decision Score</TableHead>
              <TableHead className="text-right">Chance of becoming #1</TableHead>
              <TableHead>Research Completeness</TableHead>
              <TableHead>Recommendation</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((market) => (
              <TableRow key={market.slug} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/markets/${market.slug}`}>{market.name}</Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{market.status}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">{market.totalMarketScore ?? market.score}</TableCell>
                <TableCell className="text-right font-mono text-sm">{market.decisionScore ?? market.score}</TableCell>
                <TableCell className="text-right font-mono text-sm">{market.chance}%</TableCell>
                <TableCell>
                  <div className="flex min-w-36 items-center gap-2">
                    <Progress value={market.completeness} className="h-2" />
                    <span className="w-9 font-mono text-xs text-muted-foreground">{market.completeness}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{market.recommendation}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{market.updatedAt}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {market.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
