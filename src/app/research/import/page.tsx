import Link from "next/link";
import { Upload, WandSparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ResearchImportClient } from "@/app/research/import/research-import-client";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function ResearchImportPage() {
  return (
    <div>
      <PageHeader
        title="Research Import"
        description="Paste a ChatGPT research response, extract a structured research package, validate it locally, and save it to the Research Inbox."
        icon={Upload}
        actions={<Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/research/prompt-builder"><WandSparkles data-icon="inline-start" />Build Prompt</Link>}
      />
      <div className="p-4 lg:p-6">
        <ResearchImportClient />
      </div>
    </div>
  );
}
