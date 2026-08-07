import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar, Avatar, EmptyState } from "@/components/console/ui";
import { UnassignButton } from "./unassign-button";
import { DeleteTeamMemberButton } from "./delete-team-member-button";

export default async function TeamMemberDetailPage({ params }: { params: Promise<{ teamMemberId: string }> }) {
  const { teamMemberId } = await params;
  const supabase = await supabaseServer();

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, full_name, email, created_at")
    .eq("id", teamMemberId)
    .single();

  if (!teamMember) notFound();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, profile_id, profiles(first_name, last_name)")
    .eq("assigned_team_member_id", teamMemberId)
    .order("created_at", { ascending: true });

  const companyList = companies ?? [];

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Team", href: "/owner/team" }, { label: teamMember.full_name }]} />
      <div className="wrap">
        <div className="hero">
          <Avatar name={teamMember.full_name} id={teamMember.id} size="lg" />
          <div style={{ minWidth: 0 }}>
            <h2>{teamMember.full_name}</h2>
            <div className="line">
              {teamMember.email} · team member since {new Date(teamMember.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="acts">
            <DeleteTeamMemberButton teamMemberId={teamMemberId} name={teamMember.full_name} companyCount={companyList.length} />
          </div>
        </div>

        <div className="ccard">
          <header>
            <h3>Assigned companies</h3>
            <span className="hint">{companyList.length} total</span>
          </header>
          {companyList.length === 0 && <EmptyState title="No companies assigned" subtitle="Assign companies to this team member from a client's page." />}
          {companyList.map((c) => {
            const profile = c.profiles as unknown as { first_name: string; last_name: string } | null;
            const clientName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Unknown client";
            return (
              <div key={c.id} className="rl" style={{ alignItems: "center" }}>
                <div>
                  <Link href={`/owner/contacts/${c.profile_id}/${c.id}`} className="name" style={{ color: "inherit" }}>
                    {c.business_name}
                  </Link>
                  <div className="y" style={{ marginTop: 4 }}>
                    {clientName}
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <UnassignButton companyId={c.id} companyName={c.business_name ?? "this company"} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
