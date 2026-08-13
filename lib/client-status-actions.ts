"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { updateContactCustomFields } from "@/lib/ghl/client";
import { CONTACT_FIELDS } from "@/lib/ghl/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Owner/Team only - unlike Going Out of Business, this isn't something a
// client can flip on themselves; it's a firm decision about the
// relationship as a whole, so there's no client-facing entry point.
export async function setClientStatus(profileId: string, status: "Active" | "Inactive"): Promise<ActionResult> {
  const supabase = await supabaseServer();

  const { data: profile, error: fetchError } = await supabase.from("profiles").select("ghl_contact_id").eq("id", profileId).single();
  if (fetchError || !profile) return { ok: false, error: "Client not found." };

  if (profile.ghl_contact_id) {
    try {
      await updateContactCustomFields(profile.ghl_contact_id, [{ id: CONTACT_FIELDS.clientStatus, field_value: status }]);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to update GHL" };
    }
  }

  const { error: updateError } = await supabase.from("profiles").update({ status }).eq("id", profileId);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}
