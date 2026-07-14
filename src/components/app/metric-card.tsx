import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  detail,
  valueClassName,
  indicatorClassName,
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
  indicatorClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
          {indicatorClassName ? <span className={cn("size-2 rounded-full", indicatorClassName)} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-semibold tracking-tight", valueClassName)}>{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}
