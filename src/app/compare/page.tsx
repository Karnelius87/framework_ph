import { GitCompareArrows } from "lucide-react";
import { CompareWorkbench } from "@/components/app/compare-workbench";
import { PageHeader } from "@/components/app/page-header";
import { markets } from "@/data/research";

export default function ComparePage() {
  return (
    <div>
      <PageHeader title="Compare" description="Select any number of markets and compare score, radar, strengths, weaknesses, research completeness, and confidence." icon={GitCompareArrows} />
      <div className="p-4 lg:p-6"><CompareWorkbench markets={markets} /></div>
    </div>
  );
}
