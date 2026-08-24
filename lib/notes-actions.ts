"use server";

import { supabaseServer } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Notes are staff/owner-only (never client-created), so the author is
// always resolvable from the current session - no need for a manual "who
// logged this" picker. Stored as a name snapshot, not a live FK, since an
// activity log should record who acted at the time, not re-point to
// whoever holds that account later.
async function resolveActorName(supabase: Awaited<ReturnType<typeof supabaseServer>>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: teamMember } = await supabase.from("team_members").select("full_name").eq("id", user.id).maybeSingle();
  if (teamMember?.full_name) return teamMember.full_name;

  const { data: owner } = await supabase.from("owners").select("full_name").eq("id", user.id).maybeSingle();
  if (owner?.full_name) return owner.full_name;

  return user.email ?? null;
}

export async function addNote(input: {
  companyId?: string;
  profileId?: string;
  outcome?: string;
  body: string;
}): Promise<ActionResult> {
  if (!input.companyId && !input.profileId) {
    return { ok: false, error: "Note must be tied to either a company or a client." };
  }
  if (input.companyId && input.profileId) {
    return { ok: false, error: "Note can't be tied to both a company and a client." };
  }
  if (!input.body.trim()) {
    return { ok: false, error: "Note can't be empty." };
  }

  const supabase = await supabaseServer();
  const createdByName = await resolveActorName(supabase);

  const { error } = await supabase.from("notes").insert({
    company_id: input.companyId || null,
    profile_id: input.profileId || null,
    outcome: input.outcome || null,
    body: input.body.trim(),
    created_by_name: createdByName,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
