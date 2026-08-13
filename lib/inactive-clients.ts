import { supabaseAdmin } from "@/lib/supabase/admin";

// The recurring cron jobs (payroll rollover, monthly bookkeeping reset,
// annual extension reset) operate over GHL opportunities directly, which
// have no concept of the client's Active/Inactive status - that only lives
// in Supabase `profiles`. This bridges the two: a set of ghl_opportunity_id
// values belonging to Inactive clients, for each job to skip.
export async function getInactiveCompanyOpportunityIds(): Promise<Set<string>> {
  const { data } = await supabaseAdmin()
    .from("companies")
    .select("ghl_opportunity_id, profiles!inner(status)")
    .eq("profiles.status", "Inactive");

  return new Set((data ?? []).map((c) => c.ghl_opportunity_id));
}
