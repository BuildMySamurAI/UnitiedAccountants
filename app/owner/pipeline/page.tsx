import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getAllOpportunitiesInPipeline } from "@/lib/ghl/client";
import { PIPELINE_NEW_CORP_ONBOARDING, PIPELINE_STAGES } from "@/lib/ghl/constants";
import { ConsoleTopBar, EmptyState } from "../_components/ui";

const DOT: Record<string, string> = {
  "Client Onboarding": "var(--ink-3)",
  "Sunbiz Filed": "var(--blue)",
  "EIN Applied": "var(--blue)",
  "Tax Registrations In Progress": "var(--amber)",
  "QC Review": "var(--amber)",
  "Active Client": "var(--green)",
};

export default async function PipelinePage() {
  const supabase = await supabaseServer();

  const [opportunities, { data: companies }] = await Promise.all([
    getAllOpportunitiesInPipeline(PIPELINE_NEW_CORP_ONBOARDING),
    supabase
      .from("companies")
      .select("id, business_name, profile_id, ghl_opportunity_id, assigned_team_member_id, profiles(first_name, last_name), team_members(full_name)")
      .order("created_at", { ascending: true }),
  ]);

  const companyByOpportunityId = new Map((companies ?? []).map((c) => [c.ghl_opportunity_id, c]));

  const columns = PIPELINE_STAGES.map((stage) => {
    const deals = opportunities
      .filter((o) => o.pipelineStageId === stage.id)
      .map((o) => {
        const company = companyByOpportunityId.get(o.id);
        const profile = company?.profiles as unknown as { first_name: string; last_name: string } | null;
        const teamMember = company?.team_members as unknown as { full_name: string } | null;
        return {
          opportunityId: o.id,
          name: company?.business_name ?? o.name,
          companyId: company?.id,
          profileId: company?.profile_id,
          clientName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Unknown client",
          assignee: teamMember?.full_name ?? "Unassigned",
        };
      });
    return { ...stage, deals };
  });

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "Pipeline" }]} />
      <div className="wrap">
        <h2 className="page">Pipeline</h2>
        <p className="sub">
          Live from GoHighLevel - {opportunities.length} companies across {PIPELINE_STAGES.length} stages. A client
          with multiple companies shows one card per company.
        </p>

        {opportunities.length === 0 ? (
          <EmptyState title="No companies in the pipeline" />
        ) : (
          <div className="board">
            {columns.map((col) => (
              <div key={col.id} className="col">
                <h4>
                  <span className="dot" style={{ background: DOT[col.name] }} />
                  {col.name}
                  <span className="c">{col.deals.length}</span>
                </h4>
                {col.deals.map((d) => (
                  <Link
                    key={d.opportunityId}
                    href={d.profileId && d.companyId ? `/owner/contacts/${d.profileId}/${d.companyId}` : "/owner/contacts"}
                    className="deal"
                  >
                    <div className="dn">{d.name}</div>
                    <div className="dc">{d.clientName}</div>
                    <div className="dv">
                      <span className="amt" style={{ color: "var(--ink-2)" }}>
                        {d.assignee}
                      </span>
                    </div>
                  </Link>
                ))}
                {col.deals.length === 0 && (
                  <div className="cempty" style={{ padding: 16, fontSize: 11.5 }}>
                    Nothing here
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
