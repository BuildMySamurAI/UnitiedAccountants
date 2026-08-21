import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS, PIPELINE_STAGES } from "@/lib/ghl/constants";
import { ConsoleTopBar, StatCard, EmptyState } from "@/components/console/ui";

export default async function TodayPage() {
  const supabase = await supabaseServer();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, profile_id, ghl_opportunity_id, assigned_team_member_id, created_at, updated_at, profiles(first_name, last_name, status)")
    .order("created_at", { ascending: true });

  const list = companies ?? [];

  const details = await Promise.all(
    list.map(async (c) => {
      try {
        const opportunity = await getOpportunity(c.ghl_opportunity_id);
        const cf = opportunity.customFields;
        return {
          company: c,
          stageId: opportunity.pipelineStageId as string,
          ein: customFieldValue(cf, OPPORTUNITY_FIELDS.ein),
          reconciliationCompletionDate: customFieldValue(cf, OPPORTUNITY_FIELDS.reconciliationCompletionDate),
          statementsReceived: customFieldValue(cf, OPPORTUNITY_FIELDS.statementsReceived),
          currentMonth: customFieldValue(cf, OPPORTUNITY_FIELDS.currentMonth),
          payrollProcessingDate: customFieldValue(cf, OPPORTUNITY_FIELDS.payrollProcessingDate),
        };
      } catch {
        return null;
      }
    })
  );
  const ok = details.filter((d): d is NonNullable<typeof d> => d !== null);

  const activeStageId = PIPELINE_STAGES[PIPELINE_STAGES.length - 1].id;
  const activeClients = new Set(
    list.filter((c) => (c.profiles as unknown as { status?: string } | null)?.status !== "Inactive").map((c) => c.profile_id)
  ).size;
  const inProgress = ok.filter((d) => d.stageId !== activeStageId).length;
  const unassigned = list.filter((c) => !c.assigned_team_member_id).length;
  const awaitingStatements = ok.filter((d) => !d.reconciliationCompletionDate && d.statementsReceived !== "Yes").length;

  type Flag = { tone: "r" | "a" | "b"; text: string; sub: string; href: string };
  const flags: Flag[] = [];
  for (const d of ok) {
    const profile = d.company.profiles as unknown as { first_name: string; last_name: string } | null;
    const clientName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "A client";
    const href = `/owner/contacts/${d.company.profile_id}/${d.company.id}`;
    const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === d.stageId);

    if (!d.ein && stageIndex > 0) {
      flags.push({ tone: "r", text: `${clientName}'s ${d.company.business_name} still has no EIN on file.`, sub: "blocks tax filings", href });
    }
    if (!d.company.assigned_team_member_id) {
      flags.push({ tone: "b", text: `${d.company.business_name} isn't assigned to a team member yet.`, sub: clientName, href });
    }
    if (!d.reconciliationCompletionDate && d.statementsReceived !== "Yes") {
      flags.push({ tone: "a", text: `${clientName} hasn't sent statements for ${d.currentMonth || "this month"} yet.`, sub: d.company.business_name ?? "", href });
    }
  }

  const recentActivity = [...list]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  const payrollSoon = ok
    .filter((d) => d.payrollProcessingDate)
    .sort((a, b) => new Date(a.payrollProcessingDate!).getTime() - new Date(b.payrollProcessingDate!).getTime())
    .slice(0, 4);

  const { data: multiEntityProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, companies(id)")
    .order("created_at", { ascending: false });
  const multiEntity = (multiEntityProfiles ?? []).filter((p) => (p.companies?.length ?? 0) > 1);

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Today" }]} />
      <div className="wrap">
        <h2 className="page">Good day</h2>
        <p className="sub">
          {today} · {flags.length} item{flags.length === 1 ? "" : "s"} need you.
        </p>

        <div className="strip">
          <StatCard k="Active clients" v={activeClients} />
          <StatCard k="Companies in progress" v={inProgress} d={inProgress > 0 ? <em>not yet Active Client</em> : undefined} />
          <StatCard k="Awaiting statements" v={awaitingStatements} d={awaitingStatements > 0 ? <em className="warn">bookkeeping cycle open</em> : undefined} />
          <StatCard k="Unassigned companies" v={unassigned} d={unassigned > 0 ? <em className="warn">no team member yet</em> : undefined} />
        </div>

        <div className="detail">
          <div>
            <div className="ccard" style={{ marginBottom: 16 }}>
              <header>
                <h3>Needs you today</h3>
                <span className="hint">auto-flagged</span>
              </header>
              {flags.length === 0 && <EmptyState title="Nothing flagged" subtitle="Everything looks caught up." />}
              {flags.slice(0, 8).map((f, i) => (
                <div key={i} className="rl">
                  <span className={`b ${f.tone}`} />
                  <div>
                    <div className="x">{f.text}</div>
                    <div className="y">{f.sub}</div>
                  </div>
                  <Link href={f.href} className="cbtn ghost" style={{ marginLeft: "auto" }}>
                    Open
                  </Link>
                </div>
              ))}
            </div>

            <div className="ccard">
              <header>
                <h3>Recently updated</h3>
                <span className="hint">from the portal</span>
              </header>
              {recentActivity.length === 0 && <EmptyState title="No activity yet" />}
              {recentActivity.map((c) => {
                const profile = c.profiles as unknown as { first_name: string; last_name: string } | null;
                return (
                  <Link key={c.id} href={`/owner/contacts/${c.profile_id}/${c.id}`} className="rl click" style={{ color: "inherit" }}>
                    <span className="b g" />
                    <div>
                      <div className="x">
                        <b>{c.business_name}</b> - {profile ? `${profile.first_name} ${profile.last_name}` : "Unknown client"}
                      </div>
                      <div className="y">{new Date(c.updated_at).toLocaleString()}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rail">
            <div className="ccard">
              <header>
                <h3>Upcoming payroll</h3>
              </header>
              {payrollSoon.length === 0 && <EmptyState title="Nothing scheduled" />}
              {payrollSoon.map((d) => (
                <Link key={d.company.id} href={`/owner/contacts/${d.company.profile_id}/${d.company.id}`} className="rl click" style={{ color: "inherit" }}>
                  <span className="b b" />
                  <div>
                    <div className="x">{d.company.business_name}</div>
                    <div className="y">{new Date(d.payrollProcessingDate!).toLocaleDateString()}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="ccard">
              <header>
                <h3>Multi-entity clients</h3>
                <span className="hint">{multiEntity.length}</span>
              </header>
              {multiEntity.length === 0 && <EmptyState title="None yet" />}
              {multiEntity.map((p) => (
                <Link key={p.id} href={`/owner/contacts/${p.id}`} className="rl click" style={{ color: "inherit" }}>
                  <span className="b b" />
                  <div>
                    <div className="x">
                      {p.first_name} {p.last_name}
                    </div>
                    <div className="y">{p.companies?.length} entities</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
