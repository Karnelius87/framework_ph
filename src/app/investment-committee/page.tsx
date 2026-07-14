import Link from "next/link";
import { Landmark, MonitorPlay } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getInvestmentCommitteeData } from "@/lib/investment/committee";
import { InvestmentCommitteeClient } from "@/app/investment-committee/investment-committee-client";

export const dynamic = "force-dynamic";

export default async function InvestmentCommitteePage() {
  const data = await getInvestmentCommitteeData();

  return (
    <div>
      <PageHeader
        title="Investment Committee"
        description="The primary decision page for ranking markets, exposing uncertainty, and approving Build / Validate / Watch / Reject calls."
        icon={Landmark}
        actions={(
          <Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/investment-committee/meeting">
            <MonitorPlay data-icon="inline-start" />
            Meeting Mode
          </Link>
        )}
      />
      <div className="p-4 lg:p-6">
        <InvestmentCommitteeClient data={data} />
      </div>
    </div>
  );
}
