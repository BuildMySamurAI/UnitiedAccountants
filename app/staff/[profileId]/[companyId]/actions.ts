"use server";

import { supabaseServer } from "@/lib/supabase/server";
import {
  updateOpportunityCustomFields,
  uploadMedia,
  setOpportunityFileField,
  appendOpportunityFileField,
  getOpportunity,
} from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { validEntityTypesFor } from "@/lib/company-type";
import { staffAssignmentContext, canEditField } from "@/lib/staff-access";
import { revealCompanySsn, type RevealResult } from "@/lib/ssn-reveal";

export type ActionResult = { ok: true } | { ok: false; error: string };

// EIN/SSN is a general field (not gated by service assignment - see
// lib/staff-access.ts), so this doesn't add any new restriction beyond the
// same company access any staff member with an assignment already has.
export async function revealSsn(companyId: string): Promise<RevealResult> {
  const supabase = await supabaseServer();
  return revealCompanySsn(supabase, companyId, "team");
}

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

  // Owner always has full field-edit access regardless of assignment - the
  // Owner Portal reuses this exact same action for every field, so without
  // this check the owner would be subject to the same per-service
  // restriction as staff below, and get blocked on any company with no
  // assignee covering that field's service (only surfaces on a company
  // with zero assignments at all, which is why this went unnoticed until
  // now).
  const { data: ownerRow } = await supabase.from("owners").select("id").eq("id", user.id).maybeSingle();
  if (ownerRow) {
    return { ok: true, ghl_opportunity_id: company.ghl_opportunity_id };
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

  const ghlUpdates: { id: string; field_value: string }[] = [{ id: ghlFieldId, field_value: value }];
  const dbUpdates: Record<string, string | null> = { [dbColumn]: value };

  // Entity Type drives the income tax deadline calculation (lib/tax-
  // deadline.ts), so it has to stay consistent with Type - a Personal filer
  // can only be "Individual"; a Company can't be. See lib/company-type.ts.
  if (ghlFieldId === OPPORTUNITY_FIELDS.entityType && value) {
    const opportunity = await getOpportunity(company.ghl_opportunity_id);
    const currentCompanyType = customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.companyType);
    const allowed = validEntityTypesFor(currentCompanyType);
    if (!allowed.includes(value)) {
      return { ok: false, error: `"${value}" isn't valid for this company's Type - choose ${allowed.join(" or ")}.` };
    }
  }

  // Changing Type can leave the existing Entity Type contradicting the new
  // value (e.g. switching to Personal while Entity Type is still S-Corp) -
  // clear it in the same save rather than leaving a stale, now-invalid
  // combination sitting there for the deadline calculation to silently use.
  if (ghlFieldId === OPPORTUNITY_FIELDS.companyType) {
    const opportunity = await getOpportunity(company.ghl_opportunity_id);
    const currentEntityType = customFieldValue(opportunity.customFields, OPPORTUNITY_FIELDS.entityType);
    if (currentEntityType && !validEntityTypesFor(value).includes(currentEntityType)) {
      ghlUpdates.push({ id: OPPORTUNITY_FIELDS.entityType, field_value: "" });
      dbUpdates.entity_type = null;
    }
  }

  try {
    await updateOpportunityCustomFields(company.ghl_opportunity_id, ghlUpdates);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update GHL" };
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update(dbUpdates)
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
