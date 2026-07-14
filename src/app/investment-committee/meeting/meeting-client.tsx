"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Maximize2, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type MeetingSection = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
};

export function InvestmentCommitteeMeetingClient({ sections }: { sections: MeetingSection[] }) {
  const [index, setIndex] = useState(0);
  const section = sections[index];

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") setIndex((current) => Math.min(sections.length - 1, current + 1));
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(0, current - 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sections.length]);

  return (
    <main className="min-h-screen bg-background text-foreground print:bg-white print:text-black">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col p-6 print:p-0">
        <header className="flex items-center justify-between gap-3 print:hidden">
          <Link href="/investment-committee" className="text-sm text-muted-foreground hover:text-foreground">Back to Committee</Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer data-icon="inline-start" />Print</Button>
            <Button variant="outline" size="sm" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize2 data-icon="inline-start" />Full screen</Button>
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-10">
          <div className="w-full">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">{section.eyebrow}</div>
            <h1 className="mt-4 text-5xl font-semibold leading-tight md:text-7xl print:text-4xl">{section.title}</h1>
            <p className="mt-6 max-w-4xl text-2xl leading-relaxed text-muted-foreground print:text-lg">{section.body}</p>
            <div className="mt-8 grid gap-3">
              {section.bullets.map((bullet, bulletIndex) => (
                <div key={`${bullet}-${bulletIndex}`} className="rounded-md border bg-card p-4 text-xl print:border-black print:bg-white print:text-base">{bullet}</div>
              ))}
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between gap-3 print:hidden">
          <Button variant="outline" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}><ChevronLeft data-icon="inline-start" />Previous</Button>
          <div className="font-mono text-sm text-muted-foreground">{index + 1} / {sections.length}</div>
          <Button onClick={() => setIndex((current) => Math.min(sections.length - 1, current + 1))} disabled={index === sections.length - 1}>Next <ChevronRight data-icon="inline-end" /></Button>
        </footer>
      </div>
      <div className="hidden print:block">
        {sections.map((printSection) => (
          <section key={printSection.title} className="break-after-page p-8">
            <div className="text-sm uppercase">{printSection.eyebrow}</div>
            <h2 className="mt-3 text-4xl font-bold">{printSection.title}</h2>
            <p className="mt-4 text-lg">{printSection.body}</p>
            <ul className="mt-4 list-disc pl-6">
              {printSection.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
