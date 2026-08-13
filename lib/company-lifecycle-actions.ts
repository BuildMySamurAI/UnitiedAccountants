"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { updateOpportunityCustomFields } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { CLOSING_PROCESS_TASK_TITLES } from "@/lib/tasks";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Shared by the Owner/Team company page and the Client Portal - both can
// flip this toggle. The task-creation and E-File status flip only happen
// the first time this company ever gets a closing checklist - checked
// against whether closing_process tasks already exist for it, not just the
// field's last value, so toggling Yes -> No -> Yes again doesn't duplicate
// the checklist (a check against the prior field value alone would miss
// this, since "No" resets that signal but the old tasks are still there).
export async function setGoingOutOfBusiness(
  companyId: string,
  value: "Yes" | "No",
  createdBy: "team" | "client"
): Promise<ActionResult> {
  const supabase = await supabaseServer();

  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("ghl_opportunity_id")
    .eq("id", companyId)
    .single();

  if (fetchError || !company) {
    return { ok: false, error: "Company not found." };
  }

  try {
    await updateOpportunityCustomFields(company.ghl_opportunity_id, [{ id: OPPORTUNITY_FIELDS.goingOutOfBusiness, field_value: value }]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update GHL" };
  }

  const { error: updateError } = await supabase.from("companies").update({ going_out_of_business: value }).eq("id", companyId);
  if (updateError) return { ok: false, error: updateError.message };

  if (value === "Yes") {
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("task_type", "closing_process");
    if (count && count > 0) return { ok: true };

    const { error: insertError } = await supabase.from("tasks").insert(
      CLOSING_PROCESS_TASK_TITLES.map((title) => ({
        company_id: companyId,
        task_type: "closing_process" as const,
        title,
        created_by: createdBy,
      }))
    );
    if (insertError) return { ok: false, error: `Field updated, but failed to create closing tasks: ${insertError.message}` };

    // Best-effort - the toggle and task list are the important part; if this
    // one field sync fails, it's not worth failing the whole action over.
    try {
      await updateOpportunityCustomFields(company.ghl_opportunity_id, [{ id: OPPORTUNITY_FIELDS.efileSalesTaxRegistrationStatus, field_value: "Inactive" }]);
      await supabase.from("companies").update({ efilesalestax_registration_status: "Inactive" }).eq("id", companyId);
    } catch {
      // ignore
    }
  }

  return { ok: true };
}
