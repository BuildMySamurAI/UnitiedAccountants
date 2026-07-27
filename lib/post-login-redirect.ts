import type { SupabaseClient } from "@supabase/supabase-js";

// Checked in priority order: owner > team member > client.
export async function resolvePostLoginPath(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: ownerRow } = await supabase.from("owners").select("id").eq("id", userId).maybeSingle();
  if (ownerRow) return "/owner";

  const { data: teamRow } = await supabase.from("team_members").select("id").eq("id", userId).maybeSingle();
  if (teamRow) return "/staff";

  return "/dashboard";
}
