"use server";

import { supabaseServer } from "@/lib/supabase/server";
import type { ServiceTypeKey } from "@/lib/services";

export type ActionResult = { ok: true; created: number } | { ok: false; error: string };

// Creates one company_services row per selected company, skipping any that
// already have an active service of this exact type+subtype - lets staff
// re-run this after adding a few new clients without duplicating existing
// DBPR licenses, etc.
export async function bulkAddCompanyServices(input: {
  companyIds: string[];
  serviceType: ServiceTypeKey;
  subtype?: string;
  deadlineDate?: string;
}): Promise<ActionResult> {
  if (input.companyIds.length === 0) return { ok: false, error: "Select at least one company." };

  const supabase = await supabaseServer();

  let existingQuery = supabase
    .from("company_services")
    .select("company_id")
    .in("company_id", input.companyIds)
    .eq("service_type", input.serviceType)
    .eq("status", "Active");
  existingQuery = input.subtype ? existingQuery.eq("subtype", input.subtype) : existingQuery.is("subtype", null);

  const { data: existing, error: existingError } = await existingQuery;

  if (existingError) return { ok: false, error: existingError.message };

  const alreadyHave = new Set((existing ?? []).map((r) => r.company_id));
  const toCreate = input.companyIds.filter((id) => !alreadyHave.has(id));

  if (toCreate.length === 0) return { ok: true, created: 0 };

  const { error: insertError } = await supabase.from("company_services").insert(
    toCreate.map((companyId) => ({
      company_id: companyId,
      service_type: input.serviceType,
      subtype: input.subtype || null,
      deadline_date: input.deadlineDate || null,
    }))
  );

  if (insertError) return { ok: false, error: insertError.message };
  return { ok: true, created: toCreate.length };
}
