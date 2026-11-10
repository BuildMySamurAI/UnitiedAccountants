"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { SERVICE_TYPE_LABEL, type ServiceTypeKey } from "@/lib/services";
import { syncRenewalReminderTask } from "@/lib/service-renewal-tasks";
import { getSelectableTags, resolveAllowedTags } from "@/lib/tags";

export type ActionResult = { ok: true } | { ok: false; error: string };

function labelFor(serviceType: ServiceTypeKey, subtype: string | null): string {
  return subtype ? `${SERVICE_TYPE_LABEL[serviceType]} - ${subtype}` : SERVICE_TYPE_LABEL[serviceType];
}

// Tags must come from the approved list; nothing free-typed is ever stored.
async function validateTags(requested: string[]): Promise<{ ok: true; tags: string[] } | { ok: false; error: string }> {
  let allowed: string[];
  try {
    allowed = await getSelectableTags();
  } catch {
    return { ok: false, error: "Could not load the tag list. Please try again." };
  }
  const resolved = resolveAllowedTags(requested, allowed);
  if (!resolved.ok) return { ok: false, error: `Not an approved tag: ${resolved.unknown.join(", ")}` };
  return { ok: true, tags: resolved.tags };
}

export async function addCompanyService(input: {
  companyId: string;
  serviceType: ServiceTypeKey;
  subtype?: string;
  licenseNumber?: string;
  deadlineDate?: string;
  tags?: string[];
}): Promise<ActionResult> {
  let tags: string[] = [];
  if (input.tags && input.tags.length > 0) {
    const checked = await validateTags(input.tags);
    if (!checked.ok) return checked;
    tags = checked.tags;
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("company_services")
    .insert({
      company_id: input.companyId,
      service_type: input.serviceType,
      subtype: input.subtype || null,
      license_number: input.licenseNumber || null,
      deadline_date: input.deadlineDate || null,
      tags,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  if (input.deadlineDate) {
    await syncRenewalReminderTask(supabase, {
      serviceId: data.id,
      companyId: input.companyId,
      label: labelFor(input.serviceType, input.subtype ?? null),
      deadlineDate: input.deadlineDate,
    });
  }

  return { ok: true };
}

export async function updateCompanyService(
  serviceId: string,
  fields: { deadlineDate?: string; licenseNumber?: string; status?: "Active" | "Inactive"; tags?: string[] }
): Promise<ActionResult> {
  const supabase = await supabaseServer();

  const update: Record<string, string | string[] | null> = { updated_at: new Date().toISOString() };
  if (fields.tags !== undefined) {
    const checked = await validateTags(fields.tags);
    if (!checked.ok) return checked;
    update.tags = checked.tags;
  }
  if (fields.deadlineDate !== undefined) update.deadline_date = fields.deadlineDate || null;
  if (fields.licenseNumber !== undefined) update.license_number = fields.licenseNumber || null;
  if (fields.status !== undefined) update.status = fields.status;

  const { error } = await supabase.from("company_services").update(update).eq("id", serviceId);

  if (error) return { ok: false, error: error.message };

  if (fields.deadlineDate) {
    const { data: service } = await supabase
      .from("company_services")
      .select("company_id, service_type, subtype")
      .eq("id", serviceId)
      .single();

    if (service) {
      await syncRenewalReminderTask(supabase, {
        serviceId,
        companyId: service.company_id,
        label: labelFor(service.service_type as ServiceTypeKey, service.subtype),
        deadlineDate: fields.deadlineDate,
      });
    }
  }

  return { ok: true };
}

export async function recordServiceDocumentUpload(input: {
  serviceId: string;
  companyId: string;
  year: number;
  storagePath: string;
  fileName: string;
}): Promise<ActionResult> {
  const supabase = await supabaseServer();

  const { error } = await supabase.from("company_service_documents").insert({
    service_id: input.serviceId,
    company_id: input.companyId,
    year: input.year,
    storage_path: input.storagePath,
    file_name: input.fileName,
  });

  if (error) {
    if (error.code === "42501") {
      return { ok: false, error: "Your session has expired. Please sign out and sign back in, then try again." };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function getServiceDocumentUrl(storagePath: string): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage.from("company-files").createSignedUrl(storagePath, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
}
