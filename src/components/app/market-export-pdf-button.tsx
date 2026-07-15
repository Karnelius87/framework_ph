import { FileDown } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function MarketExportPdfButton({ href }: { href: string }) {
  return (
    <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={href} data-print-hidden="true">
      <FileDown data-icon="inline-start" />
      Export PDF
    </Link>
  );
}
