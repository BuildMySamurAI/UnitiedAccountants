import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ConsoleTopBar, Avatar, EmptyState, Pill } from "@/components/console/ui";
import { InviteTeamMemberForm } from "../invite-form";
import { ResendInviteButton } from "./resend-invite-button";
import { LinkOrphanedMemberButton } from "./link-orphaned-member-button";

export default async function TeamPage() {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // `companies` has 5 different FK columns pointing at team_members (the
  // company-level assignee plus 4 per-service assignees) - an unqualified
  // embed here is ambiguous to PostgREST, which errors the whole query out
  // silently (the error was never checked) and made every team member
  // disappear from this page even though their rows existed.
  const { data: teamMembers, error: teamMembersError } = await supabase
    .from("team_members")
    .select("id, full_name, email, created_at, companies!companies_assigned_team_member_id_fkey(id)")
    .order("created_at", { ascending: false });

  if (teamMembersError) {
    console.error("Failed to load team members:", teamMembersError);
  }

  const members = teamMembers ?? [];

  // team_members.id is always the matching auth.users id (set to
  // invited.user.id at invite time) - pull each one's confirmation status
  // so the list can show who still needs a nudge to accept.
  const statusById = new Map<string, { confirmed: boolean }>();
  await Promise.all(
    members.map(async (t) => {
      const { data } = await admin.auth.admin.getUserById(t.id);
      statusById.set(t.id, { confirmed: Boolean(data?.user?.email_confirmed_at) });
    })
  );

  // Reconciliation: find invited auth accounts that never got a
  // team_members row (invite succeeded, local insert didn't). Team invites
  // are tagged with `full_name` (no `first_name`), unlike client invites -
  // but owner accounts use the same shape, so those must be excluded too.
  const { data: owners } = await admin.from("owners").select("id");
  const teamIds = new Set(members.map((t) => t.id));
  const ownerIds = new Set((owners ?? []).map((o) => o.id));
  const orphaned: { id: string; email: string; fullName: string }[] = [];
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data?.users ?? [];
    for (const u of users) {
      if (teamIds.has(u.id) || ownerIds.has(u.id)) continue;
      const meta = u.user_metadata as { full_name?: string; first_name?: string } | undefined;
      if (meta?.full_name && !meta?.first_name && u.email) {
        orphaned.push({ id: u.id, email: u.email, fullName: meta.full_name });
      }
    }
    if (users.length < 200) break;
    page++;
  }

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Team" }]} />
      <div className="wrap">
        <h2 className="page">Team</h2>
        <p className="sub">{members.length} team members invited</p>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Invite a team member</h3>
          </header>
          <div style={{ padding: 15 }}>
            <InviteTeamMemberForm />
          </div>
        </div>

        <div className="ccard" style={{ marginBottom: orphaned.length > 0 ? 16 : 0 }}>
          <header>
            <h3>All team members</h3>
            <span className="hint">{members.length} total</span>
          </header>
          {members.map((t) => {
            const confirmed = statusById.get(t.id)?.confirmed ?? false;
            return (
              <div key={t.id} className="rl" style={{ alignItems: "center" }}>
                <Link href={`/owner/team/${t.id}`} className="person click" style={{ color: "inherit", flex: 1, minWidth: 0 }}>
                  <Avatar name={t.full_name} id={t.id} />
                  <div>
                    <div className="name">{t.full_name}</div>
                    <div className="meta">
                      {t.email} · {t.companies?.length ?? 0} compan{t.companies?.length === 1 ? "y" : "ies"} assigned
                    </div>
                  </div>
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                  <Pill variant={confirmed ? "g" : "a"}>{confirmed ? "Active" : "Pending"}</Pill>
                  {!confirmed && <ResendInviteButton teamMemberId={t.id} />}
                </div>
              </div>
            );
          })}
          {members.length === 0 && <EmptyState title="No team members invited yet" />}
        </div>

        {orphaned.length > 0 && (
          <div className="ccard">
            <header>
              <h3>Unlinked invites</h3>
              <span className="hint">{orphaned.length} total</span>
            </header>
            <p style={{ padding: "0 15px", fontSize: 12.5, color: "var(--ink-3)" }}>
              These accounts were invited and can already log in, but something went wrong saving their team record, so
              they don&apos;t show up above. Link them to add them to the team list.
            </p>
            {orphaned.map((o) => (
              <div key={o.id} className="rl" style={{ alignItems: "center" }}>
                <div>
                  <div className="name">{o.fullName}</div>
                  <div className="meta">{o.email}</div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <LinkOrphanedMemberButton userId={o.id} fullName={o.fullName} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
