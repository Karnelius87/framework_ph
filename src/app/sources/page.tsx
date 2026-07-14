import { Database } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sources = await getDb().source.findMany({ orderBy: { createdAt: "desc" }, include: { claims: true } });

  return (
    <div>
      <PageHeader title="Sources" description="Every research statement should link to evidence with level, category, date, and notes." icon={Database} />
      <div className="p-4 lg:p-6">
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Evidence Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.title}</TableCell>
                    <TableCell>{source.publisher}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{source.accessedAt.toISOString().slice(0, 10)}</TableCell>
                    <TableCell><Badge variant="secondary">{source.evidenceLevel}</Badge></TableCell>
                    <TableCell>{source.sourceType}</TableCell>
                    <TableCell className="text-muted-foreground">{source.notes} - {source.claims.length} claim links</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
