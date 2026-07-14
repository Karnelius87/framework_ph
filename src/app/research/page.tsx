import { BookOpen, Inbox, ListTodo, Upload, WandSparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { markets, notes } from "@/data/research";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResearchPage() {
  return (
    <div>
      <PageHeader
        title="Research"
        description="Notes are separate from report chapters and imported research must be reviewed before approval."
        icon={BookOpen}
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/prompt-builder">Prompt Builder</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/actions">Action Center</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/import">Import Research</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/inbox">Research Inbox</Link>
          </>
        }
      />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_340px] lg:p-6">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FeatureLink href="/research/prompt-builder" icon={WandSparkles} title="Prompt Builder" description="Create ChatGPT prompts for valid Research Package 2.0 JSON." />
            <FeatureLink href="/research/actions" icon={ListTodo} title="Action Center" description="Work through next research tasks by market and priority." />
            <FeatureLink href="/research/import" icon={Upload} title="Import Research" description="Paste, validate, and save structured research packages." />
            <FeatureLink href="/research/inbox" icon={Inbox} title="Research Inbox" description="Review imported claims, sources, scores, and decision items." />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Research notes</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {notes.map((note) => (
                <div key={note.title} className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[1fr_140px_120px] md:items-center">
                  <div>
                    <div className="text-sm font-medium">{note.title}</div>
                    <div className="mt-2 flex flex-wrap gap-1">{note.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
                  </div>
                  <Badge variant="secondary">{note.status}</Badge>
                  <div className="text-sm text-muted-foreground">{note.importance} importance</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-sm">Chapter inventory</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {markets.map((market) => (
              <div key={market.slug} className="flex items-center justify-between rounded-md border bg-background p-3 text-sm">
                <span>{market.name}</span>
                <span className="font-mono text-muted-foreground">{Object.keys(market.chapters).length}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureLink({ href, icon: Icon, title, description }: { href: string; icon: typeof BookOpen; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-md border bg-card p-3 transition-colors hover:bg-accent">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
