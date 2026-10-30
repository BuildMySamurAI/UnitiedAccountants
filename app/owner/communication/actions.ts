"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { getConversation, markConversationRead, sendConversationMessage } from "@/lib/ghl/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Owner Inbox writes act on real GHL conversations, so every action here
// re-checks owner access itself rather than relying on the page that renders
// the buttons.
async function requireOwner(): Promise<string | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "You must be signed in.";

  const { data: owner } = await supabase.from("owners").select("id").eq("id", user.id).maybeSingle();
  if (!owner) return "Only the practice owner can do this.";

  return null;
}

export async function markInboxConversationRead(conversationId: string): Promise<ActionResult> {
  const denied = await requireOwner();
  if (denied) return { ok: false, error: denied };

  try {
    await markConversationRead(conversationId);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to mark as read" };
  }
  return { ok: true };
}

// The contact is looked up from the conversation server-side, never taken
// from the client, so this can only ever reply inside the thread it was
// opened from.
export async function replyToInboxConversation(
  conversationId: string,
  type: "SMS" | "Email",
  message: string,
  subject?: string
): Promise<ActionResult> {
  const denied = await requireOwner();
  if (denied) return { ok: false, error: denied };

  if (!message.trim()) return { ok: false, error: "Message can't be empty." };

  try {
    const conversation = await getConversation(conversationId);
    if (!conversation?.contactId) return { ok: false, error: "Conversation not found." };
    await sendConversationMessage({ contactId: conversation.contactId, type, message, subject });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send" };
  }
  return { ok: true };
}
