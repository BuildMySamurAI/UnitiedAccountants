"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  updateOpportunityCustomFields,
  deleteOpportunity,
  deleteContact as deleteGhlContact,
  addContactTags,
} from "@/lib/ghl/client";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function inviteTeamMember(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("fullName") || "").trim();

  if (!email || !fullName) {
    return { ok: false, error: "Name and email are required." };
  }

  const admin = supabaseAdmin();

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${process.env.NEXT_PUBLIC_INTERNAL_SITE_URL}/auth/callback`,
  });

  if (inviteError) {
    return { ok: false, error: inviteError.message };
  }

  const { error: insertError } = await admin.from("team_members").insert({
    id: invited.user.id,
    email,
    full_name: fullName,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true };
}

export async function assignTeamMember(companyId: string, teamMemberId: string | null): Promise<ActionResult> {
  const supabase = await supabaseServer();

  const { data: company, error: fetchError } = await supabase
    .from("companies")
    .select("ghl_opportunity_id")
    .eq("id", companyId)
    .single();

  if (fetchError || !company) {
    return { ok: false, error: "Company not found." };
  }

  let assignedName = "";
  let assignedEmail = "";
  if (teamMemberId) {
    const { data: teamMember, error: teamMemberError } = await supabase
      .from("team_members")
      .select("full_name, email")
      .eq("id", teamMemberId)
      .single();
    if (teamMemberError || !teamMember) {
      return { ok: false, error: "Team member not found." };
    }
    assignedName = teamMember.full_name ?? "";
    assignedEmail = teamMember.email ?? "";
  }

  try {
    await updateOpportunityCustomFields(company.ghl_opportunity_id, [
      { id: OPPORTUNITY_FIELDS.assignedTeamMember, field_value: assignedName },
      { id: OPPORTUNITY_FIELDS.assignedTeamMemberEmail, field_value: assignedEmail },
    ]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update GHL" };
  }

  const { error: updateError } = await supabase
    .from("companies")
    .update({ assigned_team_member_id: teamMemberId })
    .eq("id", companyId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

export async function addContactTag(contactId: string, tag: string): Promise<ActionResult> {
  const trimmed = tag.trim();
  if (!trimmed) {
    return { ok: false, error: "Tag can't be empty." };
  }

  try {
    await addContactTags(contactId, [trimmed]);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to add tag" };
  }

  return { ok: true };
}

// Shared by deleteCompany and deleteContact (which deletes every company a
// client owns). Order matters: the CRM opportunity is deleted before the
// portal row, since re-running this after a partial failure is safe (a
// second GHL delete on an already-deleted id just errors, nothing corrupts),
// whereas deleting the portal row first would orphan the CRM record with no
// way to find it from here again.
async function deleteCompanyRecord(
  admin: ReturnType<typeof supabaseAdmin>,
  companyId: string
): Promise<ActionResult> {
  const { data: company, error: fetchError } = await admin
    .from("companies")
    .select("ghl_opportunity_id")
    .eq("id", companyId)
    .single();

  if (fetchError || !company) {
    return { ok: false, error: "Company not found." };
  }

  const { data: files } = await admin.from("files").select("storage_path").eq("company_id", companyId);
  const paths = (files ?? []).map((f) => f.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await admin.storage.from("company-files").remove(paths);
  }
  await admin.from("files").delete().eq("company_id", companyId);

  try {
    await deleteOpportunity(company.ghl_opportunity_id);
  } catch (err) {
    return { ok: false, error: `Failed to delete from the CRM: ${err instanceof Error ? err.message : "unknown error"}` };
  }

  const { error: deleteError } = await admin.from("companies").delete().eq("id", companyId);
  if (deleteError) {
    return { ok: false, error: `Deleted from the CRM, but failed to remove from the portal: ${deleteError.message}` };
  }

  return { ok: true };
}

export async function deleteCompany(companyId: string): Promise<ActionResult> {
  const admin = supabaseAdmin();
  return deleteCompanyRecord(admin, companyId);
}

export async function deleteContact(profileId: string): Promise<ActionResult> {
  const admin = supabaseAdmin();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("ghl_contact_id")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: "Client not found." };
  }

  const { data: companies } = await admin.from("companies").select("id").eq("profile_id", profileId);

  for (const c of companies ?? []) {
    const result = await deleteCompanyRecord(admin, c.id);
    if (!result.ok) {
      return { ok: false, error: `Stopped while deleting a company: ${result.error}` };
    }
  }

  if (profile.ghl_contact_id) {
    try {
      await deleteGhlContact(profile.ghl_contact_id);
    } catch (err) {
      return {
        ok: false,
        error: `Companies deleted, but failed to delete the CRM contact: ${err instanceof Error ? err.message : "unknown error"}`,
      };
    }
  }

  const { error: deleteProfileError } = await admin.from("profiles").delete().eq("id", profileId);
  if (deleteProfileError) {
    return { ok: false, error: `Deleted from the CRM, but failed to remove the portal profile: ${deleteProfileError.message}` };
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(profileId);
  if (deleteUserError) {
    return { ok: false, error: `Profile deleted, but failed to revoke portal login: ${deleteUserError.message}` };
  }

  return { ok: true };
}

export async function deleteTeamMember(teamMemberId: string): Promise<ActionResult> {
  const admin = supabaseAdmin();

  const { data: companies } = await admin
    .from("companies")
    .select("id, ghl_opportunity_id")
    .eq("assigned_team_member_id", teamMemberId);

  for (const c of companies ?? []) {
    try {
      await updateOpportunityCustomFields(c.ghl_opportunity_id, [
        { id: OPPORTUNITY_FIELDS.assignedTeamMember, field_value: "" },
        { id: OPPORTUNITY_FIELDS.assignedTeamMemberEmail, field_value: "" },
      ]);
    } catch (err) {
      return { ok: false, error: `Failed to unassign a company: ${err instanceof Error ? err.message : "unknown error"}` };
    }
  }

  const { error: updateError } = await admin
    .from("companies")
    .update({ assigned_team_member_id: null })
    .eq("assigned_team_member_id", teamMemberId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const { error: deleteRowError } = await admin.from("team_members").delete().eq("id", teamMemberId);
  if (deleteRowError) {
    return { ok: false, error: deleteRowError.message };
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(teamMemberId);
  if (deleteUserError) {
    return { ok: false, error: `Removed from the team, but failed to revoke portal login: ${deleteUserError.message}` };
  }

  return { ok: true };
}
