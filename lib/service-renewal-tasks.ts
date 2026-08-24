import type { supabaseServer } from "@/lib/supabase/server";

// One renewal reminder task per license/service row, found by service_id
// (not by title - two DBPR licenses of the same subtype would collide on
// title matching). Entering a date for the first time creates it; changing
// it later updates the same task and reopens it (a new expiration date
// means a new renewal cycle, so a previously-completed reminder shouldn't
// stay marked done). License numbers are never touched here - only the
// deadline drives this, per "keep license numbers static."
export async function syncRenewalReminderTask(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  input: { serviceId: string; companyId: string; label: string; deadlineDate: string }
): Promise<void> {
  const { data: existing } = await supabase.from("tasks").select("id, deadline_date").eq("service_id", input.serviceId).maybeSingle();

  const title = `Renew ${input.label}`.slice(0, 60);

  if (existing) {
    if (existing.deadline_date === input.deadlineDate) return;
    await supabase
      .from("tasks")
      .update({
        title,
        deadline_date: input.deadlineDate,
        status: "Not Started",
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("tasks").insert({
    company_id: input.companyId,
    service_id: input.serviceId,
    task_type: "custom",
    title,
    deadline_date: input.deadlineDate,
    created_by: "team",
    approval_status: "approved",
  });
}
