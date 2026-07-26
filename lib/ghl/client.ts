import {
  GHL_LOCATION_ID,
  PIPELINE_NEW_CORP_ONBOARDING,
  STAGE_CLIENT_ONBOARDING,
} from "./constants";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

async function ghlFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GHL_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GHL_PRIVATE_TOKEN}`,
      Version: GHL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL API ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export type GhlCustomFieldWrite = { id: string; field_value: string };

export async function upsertContact(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}) {
  return ghlFetch("/contacts/upsert", {
    method: "POST",
    body: JSON.stringify({
      locationId: GHL_LOCATION_ID,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || undefined,
    }),
  });
}

export async function getContact(contactId: string) {
  const data = await ghlFetch(`/contacts/${contactId}`);
  return data.contact;
}

export async function updateContactCustomFields(
  contactId: string,
  fields: GhlCustomFieldWrite[]
) {
  return ghlFetch(`/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify({ customFields: fields }),
  });
}

export async function createOpportunity(input: {
  contactId: string;
  name: string;
  customFields: GhlCustomFieldWrite[];
}) {
  const data = await ghlFetch("/opportunities/", {
    method: "POST",
    body: JSON.stringify({
      pipelineId: PIPELINE_NEW_CORP_ONBOARDING,
      pipelineStageId: STAGE_CLIENT_ONBOARDING,
      locationId: GHL_LOCATION_ID,
      contactId: input.contactId,
      name: input.name,
      status: "open",
      customFields: input.customFields,
    }),
  });
  return data.opportunity;
}

export async function getOpportunity(opportunityId: string) {
  const data = await ghlFetch(`/opportunities/${opportunityId}`);
  return data.opportunity;
}

export async function updateOpportunityCustomFields(
  opportunityId: string,
  fields: GhlCustomFieldWrite[]
) {
  return ghlFetch(`/opportunities/${opportunityId}`, {
    method: "PUT",
    body: JSON.stringify({ customFields: fields }),
  });
}

// assignedTo is a native opportunity property, not a custom field.
export async function updateOpportunityAssignedTo(opportunityId: string, userId: string) {
  return ghlFetch(`/opportunities/${opportunityId}`, {
    method: "PUT",
    body: JSON.stringify({ assignedTo: userId }),
  });
}

export type GhlUser = { id: string; name: string; email: string };

export async function getUsers(): Promise<GhlUser[]> {
  const data = await ghlFetch(`/users/?locationId=${GHL_LOCATION_ID}`);
  return (data.users ?? []).map((u: { id: string; name: string; email: string }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
  }));
}

export type GhlFileEntry = {
  url: string;
  meta: { mimetype: string; name: string; size: number };
  deleted: boolean;
};

// GHL's media library upload - separate from ghlFetch because this is
// multipart/form-data, not JSON (fetch sets the boundary itself for FormData).
export async function uploadMedia(file: Blob, fileName: string): Promise<{ url: string; fileId: string }> {
  const form = new FormData();
  form.append("file", file, fileName);
  form.append("locationId", GHL_LOCATION_ID);

  const res = await fetch(`${GHL_BASE_URL}/medias/upload-file`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GHL_PRIVATE_TOKEN}`,
      Version: GHL_VERSION,
    },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL media upload failed: ${res.status} ${body}`);
  }
  return res.json();
}

// FILE_UPLOAD custom fields hold an array of {url, meta, deleted} entries -
// writing a fresh array replaces it, so we read the current value and append.
export async function appendOpportunityFileField(
  opportunityId: string,
  fieldId: string,
  newEntry: GhlFileEntry
) {
  const opportunity = await getOpportunity(opportunityId);
  const existing = opportunity.customFields?.find((f: { id: string }) => f.id === fieldId);
  const existingValue: GhlFileEntry[] = Array.isArray(existing?.fieldValue)
    ? existing.fieldValue
    : existing?.fieldValue
    ? [existing.fieldValue]
    : [];

  return ghlFetch(`/opportunities/${opportunityId}`, {
    method: "PUT",
    body: JSON.stringify({
      customFields: [{ id: fieldId, field_value: [...existingValue, newEntry] }],
    }),
  });
}
