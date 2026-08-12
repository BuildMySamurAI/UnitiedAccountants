"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { getAllContacts, sendConversationMessage } from "@/lib/ghl/client";

export type BulkSendResult = {
  ok: true;
  sent: number;
  skippedDnd: number;
  skippedUnauthorized: number;
  failed: number;
};

// Re-derives the allowed audience from the caller's own RLS-scoped session
// rather than trusting the profileIds it was handed - a team member can
// only ever end up sending to profiles that RLS still lets them see at send
// time, even if the client-side list was somehow tampered with.
export async function sendBulkMessage(input: {
  profileIds: string[];
  type: "SMS" | "Email";
  message: string;
  subject?: string;
}): Promise<BulkSendResult | { ok: false; error: string }> {
  if (!input.message.trim()) return { ok: false, error: "Message can't be empty." };
  if (input.profileIds.length === 0) return { ok: false, error: "Select at least one recipient." };

  const supabase = await supabaseServer();

  const { data: allowedProfiles, error } = await supabase
    .from("profiles")
    .select("id, ghl_contact_id")
    .in("id", input.profileIds);

  if (error) return { ok: false, error: error.message };

  const skippedUnauthorized = input.profileIds.length - (allowedProfiles?.length ?? 0);

  const contacts = await getAllContacts();
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  let sent = 0;
  let skippedDnd = 0;
  let failed = 0;

  for (const profile of allowedProfiles ?? []) {
    const contact = profile.ghl_contact_id ? contactById.get(profile.ghl_contact_id) : undefined;
    if (!contact) {
      failed += 1;
      continue;
    }
    if (contact.dnd) {
      skippedDnd += 1;
      continue;
    }
    try {
      await sendConversationMessage({ contactId: contact.id, type: input.type, message: input.message, subject: input.subject });
      sent += 1;
    } catch (err) {
      console.error("bulk send failed for", contact.id, err instanceof Error ? err.message : err);
      failed += 1;
    }
  }

  return { ok: true, sent, skippedDnd, skippedUnauthorized, failed };
}
