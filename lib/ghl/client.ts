import {
  GHL_LOCATION_ID,
  PIPELINE_NEW_CORP_ONBOARDING,
  STAGE_CLIENT_ONBOARDING,
} from "./constants";

const GHL_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

// Carries the HTTP status alongside the error so callers can distinguish
// "not found" (often fine to treat as already-done, e.g. for deletes) from a
// real failure, without parsing the message string.
export class GhlApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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
    throw new GhlApiError(`GHL API ${path} failed: ${res.status} ${body}`, res.status);
  }
  // DELETE endpoints can return an empty body (204, or 200 with no content) -
  // res.json() would throw on that, so fall back to {} instead of failing a
  // successful delete.
  const text = await res.text();
  return text ? JSON.parse(text) : {};
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

export type GhlOpportunitySummary = { id: string; name: string; pipelineStageId: string };

// Paginates through every opportunity in a pipeline (GHL's search endpoint
// caps out at 100/page) using its startAfter/startAfterId cursor. Deliberately
// returns id/name/pipelineStageId only - the search endpoint's customFields
// come back in a different shape (fieldValueString/fieldValueDate with
// epoch-ms dates, etc.) than getOpportunity()'s {id, fieldValue}, which the
// rest of the app relies on. Callers needing field values should fetch each
// opportunity individually via getOpportunity() to stay on that one
// consistent parsing path. Note: pipeline_stage_id is not a working filter
// on this endpoint (silently returns zero results even for a confirmed
// match) - filter by pipelineStageId client-side instead.
export async function getAllOpportunitiesInPipeline(pipelineId: string): Promise<GhlOpportunitySummary[]> {
  const results: GhlOpportunitySummary[] = [];
  let startAfter: number | undefined;
  let startAfterId: string | undefined;

  for (;;) {
    const params = new URLSearchParams({
      location_id: GHL_LOCATION_ID,
      pipeline_id: pipelineId,
      limit: "100",
    });
    if (startAfter && startAfterId) {
      params.set("startAfter", String(startAfter));
      params.set("startAfterId", startAfterId);
    }

    const data = await ghlFetch(`/opportunities/search?${params.toString()}`);
    results.push(...(data.opportunities ?? []));

    if (!data.opportunities?.length || results.length >= (data.meta?.total ?? 0)) break;
    startAfter = data.meta?.startAfter;
    startAfterId = data.meta?.startAfterId;
    if (!startAfter || !startAfterId) break;
  }

  return results;
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

// Single-file FILE_UPLOAD fields (EIN Confirmation Letter, RT/Sales Tax
// Submission Confirmation) - a fresh upload replaces the existing one,
// unlike the multi-file client document fields which append.
export async function setOpportunityFileField(
  opportunityId: string,
  fieldId: string,
  entry: GhlFileEntry
) {
  return ghlFetch(`/opportunities/${opportunityId}`, {
    method: "PUT",
    body: JSON.stringify({
      customFields: [{ id: fieldId, field_value: [entry] }],
    }),
  });
}

export type GhlConversation = {
  id: string;
  contactId: string;
  contactName?: string;
  email?: string;
  lastMessageBody?: string;
  lastMessageDate?: number;
  lastMessageType?: string;
  lastMessageDirection?: "inbound" | "outbound";
  unreadCount?: number;
};

// Conversations belong to the GHL contact (person), not to an opportunity -
// a client with multiple companies has one shared thread across all of them,
// there is no per-opportunity scoping available from this API.
export async function searchConversations(params?: { contactId?: string; limit?: number }): Promise<GhlConversation[]> {
  const q = new URLSearchParams({
    locationId: GHL_LOCATION_ID,
    limit: String(params?.limit ?? 100),
  });
  if (params?.contactId) q.set("contactId", params.contactId);
  const data = await ghlFetch(`/conversations/search?${q.toString()}`);
  return data.conversations ?? [];
}

export type GhlMessage = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  contactId: string;
  dateAdded: string;
  messageType: string;
};

export async function getConversationMessages(conversationId: string): Promise<GhlMessage[]> {
  const data = await ghlFetch(`/conversations/${conversationId}/messages`);
  return data.messages?.messages ?? [];
}

// Sends a real outbound SMS or Email to the contact via GHL. Only read
// access to Conversations was verified while planning this feature - this
// is the first real send-path exercise, so treat failures here as a scope
// question (token permissions) rather than a bug until confirmed live.
export async function sendConversationMessage(input: {
  contactId: string;
  type: "SMS" | "Email";
  message: string;
}) {
  return ghlFetch("/conversations/messages", {
    method: "POST",
    body: JSON.stringify({
      type: input.type,
      contactId: input.contactId,
      message: input.message,
    }),
  });
}

// Permanently deletes the opportunity. Idempotent: if it's already gone
// (404), that's the desired end state, not a failure - matters because a
// portal record can outlive the CRM record it points to (e.g. if the CRM
// side was already removed some other way).
export async function deleteOpportunity(opportunityId: string) {
  try {
    return await ghlFetch(`/opportunities/${opportunityId}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof GhlApiError && err.status === 404) return { alreadyDeleted: true };
    throw err;
  }
}

// Permanently deletes the contact. Idempotent like deleteOpportunity, but
// GHL's contact endpoint is inconsistent about it - a missing contact comes
// back as 400 "Contact not found for id:..." rather than 404, so both are
// treated as already-deleted.
export async function deleteContact(contactId: string) {
  try {
    return await ghlFetch(`/contacts/${contactId}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof GhlApiError && (err.status === 404 || (err.status === 400 && /not found/i.test(err.message)))) {
      return { alreadyDeleted: true };
    }
    throw err;
  }
}

// Adds tags to a contact (additive - does not remove existing tags).
export async function addContactTags(contactId: string, tags: string[]) {
  return ghlFetch(`/contacts/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tags }),
  });
}
