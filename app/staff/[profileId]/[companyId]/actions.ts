"use server";

import { supabaseServer } from "@/lib/supabase/server";
import {
  updateOpportunityCustomFields,
  uploadMedia,
  setOpportunityFileField,
  appendOpportunityFileField,
} from "@/lib/ghl/client";
import { staffAssignmentContext, canEditField } from "@/lib/staff-access";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ASSIGNMENT_COLUMNS =
  "ghl_opportunity_id, assigned_team_member_id, bookkeeping_assigned_team_member_id, sales_tax_assigned_team_member_id, payroll_rt_assigned_team_member_id, income_tax_assigned_team_member_id";

// Re-checks the field's service scope server-side, on top of it already
// being hidden in the UI - the field-save/upload actions below are shared
// across every field, so hiding the input isn't enough on its own to stop a
// request naming a field outside the caller's assigned service(s).
async function assertFieldAccess(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  companyId: string,
  ghlFieldId: string
): Promise<{ ok: true; ghl_opportunity_id: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select(ASSIGNMENT_COLUMNS)
    .eq("id", companyId)
    .single();
  if (fetchError || !company) {
    return { ok: false, error: "Company not found." };
  }

  const ctx = staffAssignmentContext(company, user.id);
  if (!canEditField(ghlFieldId, ctx)) {
    return { ok: false, error: "You don't have access to this field." };
  }

  return { ok: true, ghl_opportunity_id: company.ghl_opportunity_id };
}

export async function updateStaffCompanyField(
  companyId: string,
  ghlFieldId: string,
  dbColumn: string,
  value: string
): Promise<ActionResult> {
  const supabase = await supabaseServer();

  const access = await assertFieldAccess(supabase, companyId, ghlFieldId);
  if (!access.ok) return access;
  const company = { ghl_opportunity_id: access.ghl_opportunity_id };

  try {
    await updateOpportunityCustomFields(company.ghl_opportunity_id, [{ id: ghlFieldId, field_value: value }]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update GHL" };
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ [dbColumn]: value })
    .eq("id", companyId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function uploadStaffDocument(
  companyId: string,
  ghlFieldId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }

  const supabase = await supabaseServer();

  const access = await assertFieldAccess(supabase, companyId, ghlFieldId);
  if (!access.ok) return access;
  const company = { ghl_opportunity_id: access.ghl_opportunity_id };

  try {
    const uploaded = await uploadMedia(file, file.name);
    await setOpportunityFileField(company.ghl_opportunity_id, ghlFieldId, {
      url: uploaded.url,
      meta: { mimetype: file.type || "application/octet-stream", name: file.name, size: file.size },
      deleted: false,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to upload to GHL" };
  }

  return { ok: true };
}

// For multi-file bookkeeping document fields (Corp Renewals, Sales Tax, etc.)
// - unlike uploadStaffDocument above, this appends rather than replaces,
// since both the team and the client can upload to these same fields.
export async function uploadStaffDocumentMulti(
  companyId: string,
  ghlFieldId: string,
  formData: FormData
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file provided." };
  }

  const supabase = await supabaseServer();

  const access = await assertFieldAccess(supabase, companyId, ghlFieldId);
  if (!access.ok) return access;
  const company = { ghl_opportunity_id: access.ghl_opportunity_id };

  try {
    const uploaded = await uploadMedia(file, file.name);
    await appendOpportunityFileField(company.ghl_opportunity_id, ghlFieldId, {
      url: uploaded.url,
      meta: { mimetype: file.type || "application/octet-stream", name: file.name, size: file.size },
      deleted: false,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to upload to GHL" };
  }

  return { ok: true };
}
