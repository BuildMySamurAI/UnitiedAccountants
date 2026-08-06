import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar, Avatar, EmptyState } from "@/components/console/ui";
import { InviteTeamMemberForm } from "../invite-form";

export default async function TeamPage() {
  const supabase = await supabaseServer();

  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("id, full_name, email, created_at, companies(id)")
    .order("created_at", { ascending: false });

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Team" }]} />
      <div className="wrap">
        <h2 className="page">Team</h2>
        <p className="sub">{teamMembers?.length ?? 0} team members invited</p>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Invite a team member</h3>
          </header>
          <div style={{ padding: 15 }}>
            <InviteTeamMemberForm />
          </div>
        </div>

        <div className="ccard">
          <header>
            <h3>All team members</h3>
            <span className="hint">{teamMembers?.length ?? 0} total</span>
          </header>
          {teamMembers?.map((t) => (
            <div key={t.id} className="person" style={{ padding: "11px 15px", borderBottom: "1px solid var(--rule-soft)" }}>
              <Avatar name={t.full_name} id={t.id} />
              <div>
                <div className="name">{t.full_name}</div>
                <div className="meta">
                  {t.email} · {t.companies?.length ?? 0} compan{t.companies?.length === 1 ? "y" : "ies"} assigned
                </div>
              </div>
            </div>
          ))}
          {teamMembers && teamMembers.length === 0 && <EmptyState title="No team members invited yet" />}
        </div>
      </div>
    </>
  );
}
