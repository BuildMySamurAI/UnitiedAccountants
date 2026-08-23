"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { updateContactFields } from "@/lib/ghl/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

// firstName/lastName/phone mirror to the GHL contact record too, same as
// company fields mirror to their opportunity - everything else here (the
// owner info fields) has no GHL equivalent and is portal-only, same as how
// profiles already stores first_name/last_name/phone directly. Email is
// deliberately not editable here - it's the Supabase Auth login identifier,
// and changing it needs the dedicated auth email-change flow, not a plain
// field edit.
const CONTACT_MIRROR_COLUMNS = {
  firstName: "first_name",
  lastName: "last_name",
  phone: "phone",
} as const;

const PORTAL_ONLY_COLUMNS = {
  ownerLegalName: "owner_legal_name",
  ownerSsn: "owner_ssn",
  ownerDateOfBirth: "owner_date_of_birth",
  ownerAddress: "owner_address",
} as const;

const EDITABLE_PROFILE_FIELDS = { ...CONTACT_MIRROR_COLUMNS, ...PORTAL_ONLY_COLUMNS };

export type EditableProfileFieldKey = keyof typeof EDITABLE_PROFILE_FIELDS;

export async function updateProfileField(
  profileId: string,
  fieldKey: EditableProfileFieldKey,
  value: string
): Promise<ActionResult> {
  const column = EDITABLE_PROFILE_FIELDS[fieldKey];
  const supabase = await supabaseServer();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ [column]: value || null })
    .eq("id", profileId);

  if (updateError) return { ok: false, error: updateError.message };

  if (fieldKey in CONTACT_MIRROR_COLUMNS) {
    const { data: profile } = await supabase.from("profiles").select("ghl_contact_id").eq("id", profileId).single();
    if (profile?.ghl_contact_id) {
      try {
        await updateContactFields(profile.ghl_contact_id, { [fieldKey]: value });
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Saved to portal, but failed to sync to GHL" };
      }
    }
  }

  return { ok: true };
}
