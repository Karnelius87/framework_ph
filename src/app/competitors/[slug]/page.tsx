import { notFound } from "next/navigation";
import { Building2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { competitors } from "@/data/research";
import { getDb } from "@/lib/db";
import { decodeJson } from "@/lib/research/json";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export function generateStaticParams() {
  return competitors.map((competitor) => ({ slug: competitor.slug }));
}

export const dynamic = "force-dynamic";

export default async function CompetitorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const competitor = await getDb().competitor.findUnique({ where: { slug }, include: { claims: { include: { claim: true } } } });
  if (!competitor) notFound();
  const strengths = decodeJson<string[]>(competitor.strengths, []);
  const weaknesses = decodeJson<string[]>(competitor.weaknesses, []);

  return (
    <div>
      <PageHeader
        title={competitor.company}
        description={`${competitor.targetSegment} competitor from ${competitor.country}.`}
        icon={Building2}
        actions={<a className={buttonVariants({ variant: "outline", size: "sm" })} href={competitor.website}><ExternalLink data-icon="inline-start" />Website</a>}
      />
      <div className="grid gap-4 p-4 xl:grid-cols-[340px_1fr] lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm">
              <Avatar className="size-10"><AvatarFallback>{competitor.logo ?? competitor.company.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              Company profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {[
                  ["Country", competitor.country],
                  ["Founded", competitor.founded],
                  ["Employees", competitor.employees],
                  ["Funding", competitor.funding],
                  ["Estimated Revenue", competitor.estimatedRevenue ?? "Unknown"],
                  ["Estimated Customers", competitor.estimatedCustomers ?? "Unknown"],
                  ["Pricing", competitor.pricing],
                  ["Target Segment", competitor.targetSegment],
                  ["Threat Level", competitor.threatLevel],
                ].map(([label, value]) => (
                  <TableRow key={label}><TableCell className="text-muted-foreground">{label}</TableCell><TableCell className="font-medium">{value}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Feature matrix</CardTitle></CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              {["Scheduling", "Payments", "CRM", "Inventory", "Messenger-first"].map((feature) => (
                <div key={feature} className="flex items-center justify-between rounded-md border bg-background p-3 text-sm">
                  <span>{feature}</span>
                  <Badge variant="outline">Needs review</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Strengths</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">{strengths.map((item) => <div key={item}>{item}</div>)}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Weaknesses</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">{weaknesses.map((item) => <div key={item}>{item}</div>)}</CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Evidence, reviews, screenshots, videos, timeline</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              {[`${competitor.claims.length} linked claims`, "Review sentiment pending", "Product screenshots queued", "Demo video needed"].map((item) => (
                <div key={item} className="rounded-md border bg-background p-3 text-sm text-muted-foreground">{item}</div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
