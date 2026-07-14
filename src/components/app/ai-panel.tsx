"use client";

import { Sparkles } from "lucide-react";
import { aiActions } from "@/data/research";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AiPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4" />
          AI Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {aiActions.map((action) => (
          <Button key={action} variant="outline" size="sm" className="justify-start">
            {action}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
