import { Settings } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Future-ready configuration surface for users, permissions, integrations, uploads, and AI."
        icon={Settings}
        actions={<Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/settings/data">Data Settings</Link>}
      />
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:p-6">
        {[
          ["Authentication", "Prepared for multi-user access control."],
          ["Comments", "Prepared for analyst review threads."],
          ["AI backend", "UI exists; model integration is intentionally off."],
          ["Supabase / PostgreSQL", "Prisma and SQLite are ready to migrate."],
          ["File uploads", "Attachment model can be added without route churn."],
          ["API access", "Route handlers can expose selected research data."],
        ].map(([title, description]) => (
          <Card key={title}>
            <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">{description}</p>
              <Switch disabled />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
