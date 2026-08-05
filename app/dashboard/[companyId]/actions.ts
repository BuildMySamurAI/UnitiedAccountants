"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { updateOpportunityCustomFields, uploadMedia, appendOpportunityFileField } from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { CLIENT_BOOKKEEPING_FILE_FIELDS } from "@/lib/ghl/bookkeeping-file-fields";

// The 7 team-provided bookkeeping fields (Corp Renewals, Sales Tax, etc.)
// are deliberately excluded here - the client only ever views those
// (uploaded by staff via the Team/Owner Portal), never uploads to them.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Your session has expired. Please sign out and sign back in, then try again." };
  }

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
    // A stale/rotated session can pass the SELECT above but fail this
    // INSERT's RLS check - surface a clear, actionable message rather than
    // the raw Postgres error text.
    if (insertError.code === "42501") {
      return { ok: false, error: "Your session has expired. Please sign out and sign back in, then try again." };
    }
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

export async function getSignedDownloadUrl(storagePath: string): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage
    .from("company-files")
    .createSignedUrl(storagePath, 60 * 5);

  if (error || !data) return null;
  return data.signedUrl;
}
