"use server";

import { getDb } from "@/lib/db";
import { approveScoreChange, reviewImportItem } from "@/lib/research/persistence";

export async function reviewImportItemAction(itemId: string, status: string, reviewerNote?: string) {
  await reviewImportItem(getDb(), itemId, status, reviewerNote);
}

export async function approveScoreChangeAction(itemId: string, reviewerNote?: string) {
  await approveScoreChange(getDb(), itemId, reviewerNote);
}
