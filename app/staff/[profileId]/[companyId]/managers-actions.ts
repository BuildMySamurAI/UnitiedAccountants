"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Invites a manager scoped to exactly one company. If this email already
// belongs to a manager (e.g. invited from a different company earlier),
// reuses that identity and just grants access to this company too, rather
// than sending a second account-setup invite - one person, one login,
// however many companies they've been granted.
export async function inviteManager(companyId: string, email: string, name: string): Promise<ActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();
  if (!normalizedEmail || !trimmedName) {
    return { ok: false, error: "Name and email are required." };
  }

  const admin = supabaseAdmin();

  const { data: existing } = await admin.from("managers").select("id").eq("email", normalizedEmail).maybeSingle();

  let managerId: string;

  if (existing) {
    managerId = existing.id;
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { full_name: trimmedName, role: "manager" },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });
    if (inviteError) return { ok: false, error: inviteError.message };

    const { error: insertError } = await admin.from("managers").insert({
      id: invited.user.id,
      email: normalizedEmail,
      invited_name: trimmedName,
    });
    if (insertError) return { ok: false, error: insertError.message };

    managerId = invited.user.id;
  }

  const { error: accessError } = await admin.from("manager_company_access").insert({ manager_id: managerId, company_id: companyId });

  // 23505 = unique violation - this manager already has access to this
  // exact company, which is fine, not an error.
  if (accessError && accessError.code !== "23505") {
    return { ok: false, error: accessError.message };
  }

  return { ok: true };
}

export async function revokeManagerAccess(managerId: string, companyId: string): Promise<ActionResult> {
  const admin = supabaseAdmin();
  const { error } = await admin.from("manager_company_access").delete().eq("manager_id", managerId).eq("company_id", companyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
