import type { SupabaseClient } from "@supabase/supabase-js";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";

export type RevealResult = { ok: true; value: string } | { ok: false; error: string };

// Shared by all 3 portals' revealSsn actions. Always reads the SSN live
// from GHL - the source of truth - never the Supabase mirror, which is
// encrypted at rest and never decrypted by the app (see
// ssn-protection-migration.sql). Fails closed: the audit log write happens
// before the value is fetched, and if it fails, nothing is revealed.
export async function revealCompanySsn(
  supabase: SupabaseClient,
  companyId: string,
  revealedByType: "owner" | "team" | "client"
): Promise<RevealResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("ghl_opportunity_id")
    .eq("id", companyId)
    .single();
  if (fetchError || !company) return { ok: false, error: "Company not found." };

  const { error: logError } = await supabase.from("ssn_reveal_log").insert({
    company_id: companyId,
    revealed_by_type: revealedByType,
    revealed_by_id: user.id,
  });
  if (logError) return { ok: false, error: "Could not record this access - reveal blocked." };

  try {
    const opportunity = await getOpportunity(company.ghl_opportunity_id);
    const value = customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.ssn) ?? "";
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch SSN" };
  }
}
