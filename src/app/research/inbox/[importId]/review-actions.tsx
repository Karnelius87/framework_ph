"use client";

import { useState, useTransition } from "react";
import { approveScoreChangeAction, reviewImportItemAction } from "@/app/research/inbox/[importId]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ReviewActions({ itemId, isScoreChange = false }: { itemId: string; isScoreChange?: boolean }) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function review(status: string) {
    startTransition(async () => {
      await reviewImportItemAction(itemId, status, note);
    });
  }

  function approveScore() {
    startTransition(async () => {
      await approveScoreChangeAction(itemId, note);
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reviewer note..." className="min-h-16" />
      <div className="flex flex-wrap gap-2">
        {isScoreChange ? <Button size="sm" onClick={approveScore} disabled={isPending}>Approve Score Change</Button> : <Button size="sm" onClick={() => review("verified")} disabled={isPending}>Accept</Button>}
        <Button size="sm" variant="outline" onClick={() => review("needs_validation")} disabled={isPending}>Needs Validation</Button>
        <Button size="sm" variant="outline" onClick={() => review("rejected")} disabled={isPending}>Reject</Button>
        <Button size="sm" variant="outline" onClick={() => review("needs_review")} disabled={isPending}>Edit / Keep Reviewing</Button>
      </div>
    </div>
  );
}
