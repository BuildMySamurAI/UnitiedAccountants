"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateOpportunityCustomFields } from "@/lib/ghl/client";
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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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
  if (teamMemberId) {
    const { data: teamMember, error: teamMemberError } = await supabase
      .from("team_members")
      .select("full_name")
      .eq("id", teamMemberId)
      .single();
    if (teamMemberError || !teamMember) {
      return { ok: false, error: "Team member not found." };
    }
    assignedName = teamMember.full_name ?? "";
  }

  try {
    await updateOpportunityCustomFields(company.ghl_opportunity_id, [
      { id: OPPORTUNITY_FIELDS.assignedTeamMember, field_value: assignedName },
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
