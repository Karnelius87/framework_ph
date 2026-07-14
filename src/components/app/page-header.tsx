import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  description: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, description, icon: Icon, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b px-4 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <div className="grid size-10 shrink-0 place-items-center rounded-md border bg-card text-muted-foreground">
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <div className="mt-1 text-sm font-medium text-foreground">{subtitle}</div> : null}
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
