"use server";

import { supabaseServer } from "@/lib/supabase/server";
import {
  updateOpportunityCustomFields,
  updateOpportunityAssignedTo,
  uploadMedia,
  setOpportunityFileField,
} from "@/lib/ghl/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateStaffCompanyField(
  companyId: string,
  ghlFieldId: string,
  dbColumn: string,
  value: string
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

  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("ghl_opportunity_id")
    .eq("id", companyId)
    .single();

  if (fetchError || !company) {
    return { ok: false, error: "Company not found." };
  }

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

export async function updateAssignedEmployee(companyId: string, userId: string): Promise<ActionResult> {
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
    await updateOpportunityAssignedTo(company.ghl_opportunity_id, userId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update GHL" };
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ ghl_assigned_to: userId })
    .eq("id", companyId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}
