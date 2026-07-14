"use client";

import { useMemo, useState } from "react";
import { FrameworkRadar } from "@/components/charts/research-charts";
import type { Market } from "@/data/research";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function CompareWorkbench({ markets }: { markets: Market[] }) {
  const [selected, setSelected] = useState<string[]>(["workshop", "beauty", "construction"]);
  const active = useMemo(() => markets.filter((market) => selected.includes(market.slug)), [markets, selected]);

  function toggle(slug: string) {
    setSelected((value) => (value.includes(slug) ? value.filter((item) => item !== slug) : [...value, slug]));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Markets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {markets.map((market) => (
            <Button key={market.slug} variant={selected.includes(market.slug) ? "default" : "outline"} className="justify-between" onClick={() => toggle(market.slug)}>
              {market.name}
              <span className="font-mono text-xs">{market.score}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {active.map((market) => (
          <Card key={market.slug}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                {market.name}
                <Badge>{market.recommendation}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-muted-foreground">Score</div><div className="font-mono text-xl">{market.score}</div></div>
                <div><div className="text-muted-foreground">Complete</div><div className="font-mono text-xl">{market.completeness}%</div></div>
                <div><div className="text-muted-foreground">Confidence</div><div className="font-mono text-xl">{market.confidence}%</div></div>
              </div>
              <Progress value={market.completeness} />
              <FrameworkRadar market={market} />
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Strengths</div>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">{market.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Weaknesses</div>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">{market.weaknesses.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
