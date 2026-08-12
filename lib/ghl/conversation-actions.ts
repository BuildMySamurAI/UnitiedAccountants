"use server";

import { sendConversationMessage } from "@/lib/ghl/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function sendContactMessage(
  contactId: string,
  type: "SMS" | "Email",
  message: string,
  subject?: string
): Promise<ActionResult> {
  if (!message.trim()) {
    return { ok: false, error: "Message can't be empty." };
  }

  try {
    await sendConversationMessage({ contactId, type, message, subject });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send" };
  }

  return { ok: true };
}
