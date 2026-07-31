"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { updateOpportunityCustomFields, uploadMedia, appendOpportunityFileField } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { CLIENT_BOOKKEEPING_FILE_FIELDS } from "@/lib/ghl/bookkeeping-file-fields";

// The 7 SHARED bookkeeping fields (Corp Renewals, Sales Tax, etc.) are
// deliberately excluded here - both client and team upload to those, so
// they go straight to GHL only (see uploadClientDocumentMulti below) rather
// than through Supabase Storage, which would leave one side blind to the
// other's uploads (GHL-direct writes never show up in our `files` table).
const DOCUMENT_FIELD_MAP: Record<string, string> = {
  formation_documents: OPPORTUNITY_FIELDS.formationDocuments,
  identification_documents: OPPORTUNITY_FIELDS.identificationDocuments,
  ...Object.fromEntries(CLIENT_BOOKKEEPING_FILE_FIELDS.map((f) => [f.fieldKey, OPPORTUNITY_FIELDS[f.key]])),
};

const EDITABLE_FIELD_MAP = {
  businessName: { ghlFieldId: OPPORTUNITY_FIELDS.businessName, column: "business_name" },
  mailingAddress: { ghlFieldId: OPPORTUNITY_FIELDS.mailingAddress, column: "mailing_address" },
  physicalAddress: { ghlFieldId: OPPORTUNITY_FIELDS.physicalAddress, column: "physical_address" },
} as const;

export type EditableFieldKey = keyof typeof EDITABLE_FIELD_MAP;

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateCompanyField(
  companyId: string,
  fieldKey: EditableFieldKey,
  value: string
): Promise<ActionResult> {
  const mapping = EDITABLE_FIELD_MAP[fieldKey];

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
    await updateOpportunityCustomFields(company.ghl_opportunity_id, [
      { id: mapping.ghlFieldId, field_value: value },
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update GHL" };
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ [mapping.column]: value })
    .eq("id", companyId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function recordDocumentUpload(
  companyId: string,
  fieldKey: string,
  storagePath: string,
  fileName: string
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

  const { error: insertError } = await supabase.from("files").insert({
    company_id: companyId,
    field_key: fieldKey,
    storage_path: storagePath,
    file_name: fileName,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  const ghlFieldId = DOCUMENT_FIELD_MAP[fieldKey];
  if (!ghlFieldId) {
    // Not a document type that syncs to GHL - stored in the portal only.
    return { ok: true };
  }

  try {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("company-files")
      .download(storagePath);

    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message || "Could not read the uploaded file back from storage");
    }

    const uploaded = await uploadMedia(fileBlob, fileName);
    await appendOpportunityFileField(company.ghl_opportunity_id, ghlFieldId, {
      url: uploaded.url,
      meta: {
        mimetype: fileBlob.type || "application/octet-stream",
        name: fileName,
        size: fileBlob.size,
      },
      deleted: false,
    });
  } catch (err) {
    // The document is safely stored in the portal either way - surface the
    // GHL sync failure distinctly so it's clear the upload itself succeeded.
    return {
      ok: false,
      error: `Saved to portal, but failed to sync to GHL: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  return { ok: true };
}

// For the 7 shared bookkeeping fields - uploads straight to GHL (no Supabase
// Storage), same mechanism as the team side, so both parties read/write the
// exact same array and never miss each other's uploads.
export async function uploadClientDocumentMulti(
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

export async function getSignedDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage
    .from("company-files")
    .createSignedUrl(storagePath, 60 * 5);

  if (error || !data) return null;
  return data.signedUrl;
}
