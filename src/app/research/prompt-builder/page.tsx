import { WandSparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { markets } from "@/data/research";
import { PromptBuilderClient } from "@/app/research/prompt-builder/prompt-builder-client";

export default function ResearchPromptBuilderPage() {
  return (
    <div>
      <PageHeader
        title="Research Prompt Builder"
        description="Create copy-ready ChatGPT prompts that return valid Research Package 2.0 JSON for the local import flow."
        icon={WandSparkles}
      />
      <div className="p-4 lg:p-6">
        <PromptBuilderClient markets={markets} />
      </div>
    </div>
  );
}
