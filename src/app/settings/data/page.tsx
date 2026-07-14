import { DatabaseBackup } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DataSettingsClient } from "@/app/settings/data/data-settings-client";

export const dynamic = "force-dynamic";

export default function DataSettingsPage() {
  return (
    <div>
      <PageHeader title="Data Settings" description="Export, backup, and reset local SQLite-backed research data." icon={DatabaseBackup} />
      <div className="p-4 lg:p-6">
        <DataSettingsClient />
      </div>
    </div>
  );
}
