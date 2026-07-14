"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Command, FileDown, Menu, Search } from "lucide-react";
import { navItems } from "@/data/research";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/app/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <aside className="hidden w-64 shrink-0 border-r bg-sidebar/95 lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 px-5">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">WS</div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">White Space Project</div>
              <div className="text-xs text-muted-foreground">Philippines Vertical SaaS</div>
            </div>
          </div>
          <Separator />
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      active && "bg-accent text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
          <div className="border-t p-3">
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs font-medium">Research cycle</div>
              <div className="mt-1 text-xs text-muted-foreground">July 2026 investment memo sprint</div>
            </div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
            <Sheet>
              <SheetTrigger render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Open navigation" />}>
                <Menu />
              </SheetTrigger>
              <SheetContent side="left" className="w-72" aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle>White Space Project</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-3">
                  {navItems.map((item) => {
                    const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          active && "bg-accent text-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                        {item.title}
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-9 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-9 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 dark:bg-input/30 dark:disabled:bg-input/80"
                placeholder="Search"
                type="search"
                suppressHydrationWarning
              />
            </div>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <Command data-icon="inline-start" />
              AI Panel
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <FileDown data-icon="inline-start" />
              Export
            </Button>
            <Button variant="outline" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
            <ThemeToggle />
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
