"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { getSelectableTags } from "@/lib/tags";
import { parseImportRows, processImportRow, type ImportRowResult, type ImportRowError } from "@/lib/bulk-import";

export type BulkImportResult = {
  results: ImportRowResult[];
  parseErrors: ImportRowError[];
};

export async function processBulkImport(formData: FormData): Promise<BulkImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { results: [], parseErrors: [{ rowNumber: 0, error: "No file provided." }] };
  }

  const text = await file.text();
  const { rows, errors: parseErrors } = parseImportRows(text);

  // Only read the tag list when some row actually uses the Tags column.
  const allowedTags = rows.some((r) => r.tags.length > 0) ? await getSelectableTags().catch(() => null) : null;

  const supabase = await supabaseServer();
  const results: ImportRowResult[] = [];
  for (const row of rows) {
    results.push(await processImportRow(supabase, row, allowedTags));
  }

  return { results, parseErrors };
}
