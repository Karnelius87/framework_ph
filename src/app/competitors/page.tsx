import Link from "next/link";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/lib/db";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const competitors = await getDb().competitor.findMany({ orderBy: { company: "asc" } });

  return (
    <div>
      <PageHeader title="Competitors" description="Competitor database with threat levels, features, evidence, and linked markets." icon={Building2} />
      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 lg:p-6">
        {competitors.map((competitor) => (
          <Link key={competitor.slug} href={`/competitors/${competitor.slug}`}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex items-start gap-3">
                  <Avatar className="size-10"><AvatarFallback>{competitor.logo ?? competitor.company.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{competitor.company}</div>
                    <div className="text-sm text-muted-foreground">{competitor.country} - {competitor.targetSegment}</div>
                  </div>
                  <Badge variant={competitor.threatLevel === "High" ? "destructive" : "secondary"}>{competitor.threatLevel}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-muted-foreground">Funding</div><div className="font-medium">{competitor.funding ?? "Unknown"}</div></div>
                  <div><div className="text-muted-foreground">Pricing</div><div className="font-medium">{competitor.pricing ?? "Unknown"}</div></div>
                  <div><div className="text-muted-foreground">Employees</div><div className="font-medium">{competitor.employees ?? "Unknown"}</div></div>
                  <div><div className="text-muted-foreground">Customers</div><div className="font-medium">{competitor.estimatedCustomers ?? "Unknown"}</div></div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
