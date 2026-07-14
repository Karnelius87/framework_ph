"use server";

import { getDb } from "@/lib/db";
import { saveResearchImport, validatePackageForSave } from "@/lib/research/persistence";

export async function validateImportPackageAction(value: unknown) {
  return validatePackageForSave(getDb(), value);
}

export async function saveImportPackageAction(value: unknown) {
  return saveResearchImport(getDb(), value);
}
