import type { SupabaseClient } from "@supabase/supabase-js";

// The company-level assignee shown/used whenever a company has no real team
// member assigned yet - keeps GHL automations and the portal display from
// ever showing a blank "nobody's responsible for this" state. Never written
// to companies.assigned_team_member_id itself: that column staying null is
// what assignTeamMember's first-assignment seeding check depends on
// (isFirstAssignment = !company.assigned_team_member_id), and owners live
// in a separate table with no FK relationship to it anyway. This is a
// display/GHL-field fallback only, never a real stored assignment - the
// moment a real team member is assigned, it's replaced exactly like any
// other value in those same fields.
export const DEFAULT_OWNER_EMAIL = "mohannad@uniacc.net";

export async function getDefaultOwner(
  supabase: SupabaseClient
): Promise<{ full_name: string; email: string } | null> {
  const { data } = await supabase
    .from("owners")
    .select("full_name, email")
    .eq("email", DEFAULT_OWNER_EMAIL)
    .maybeSingle();
  return data;
}
