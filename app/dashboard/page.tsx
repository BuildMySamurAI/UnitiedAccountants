import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar, Pill, EmptyState } from "@/components/console/ui";
import { ClientTaskForm } from "./client-task-form";
import { parseDateOnly } from "@/lib/service-deadlines";

const STAGE_PILL: Record<string, "g" | "a" | "b" | "n"> = {
  "Client Onboarding": "b",
  "Sunbiz Filed": "b",
  "EIN Applied": "b",
  "Tax Registrations In Progress": "a",
  "QC Review": "a",
  "Active Client": "g",
};

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user!.id)
    .maybeSingle();

  // Managers aren't in `profiles` at all - fall back to their own record for
  // the greeting name.
  let greetingName = profile?.first_name;
  if (!greetingName) {
    const { data: manager } = await supabase.from("managers").select("legal_name, invited_name").eq("id", user!.id).maybeSingle();
    greetingName = (manager?.legal_name || manager?.invited_name || "").split(" ")[0] || undefined;
  }

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, business_name, pipeline_stage, created_at, assigned_team_member_id")
    .order("created_at", { ascending: true });

  let myTasks: { id: string; description: string | null; status: string; deadline_date: string | null; approval_status: string }[] = [];

  if (profile) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, description, status, deadline_date, approval_status")
      .eq("profile_id", user!.id)
      .order("created_at", { ascending: false });
    myTasks = tasks ?? [];
  }

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "My Companies" }]} />
      <div className="wrap">
        <h2 className="page">Welcome{greetingName ? `, ${greetingName}` : ""}</h2>
        <p className="sub">Here are all the companies linked to your account.</p>

        {error && (
          <p style={{ fontSize: 13, color: "var(--red)", background: "var(--red-soft)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
            Could not load companies: {error.message}
          </p>
        )}

        <div className="ccard">
          <header>
            <h3>Companies</h3>
            <span className="hint">{companies?.length ?? 0} total</span>
          </header>
          {companies && companies.length === 0 && (
            <EmptyState title="No companies yet" subtitle="Your accountant will add one as soon as onboarding starts." />
          )}
          {companies?.map((c) => (
            <Link key={c.id} href={`/dashboard/${c.id}`} className="rl click" style={{ color: "inherit" }}>
              <div>
                <div className="name">{c.business_name}</div>
                <div className="y" style={{ marginTop: 4 }}>
                  {c.pipeline_stage ? <Pill variant={STAGE_PILL[c.pipeline_stage] ?? "n"}>{c.pipeline_stage}</Pill> : <Pill variant="n">Unknown</Pill>}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {profile && (
          <div className="ccard" style={{ marginTop: 16 }}>
            <header>
              <h3>Requests</h3>
              <span className="hint">{myTasks.length} sent</span>
            </header>
            {myTasks.length === 0 && <EmptyState title="Nothing sent yet" subtitle="Need something outside the usual? Send a request below." />}
            {myTasks.map((t) => (
              <div key={t.id} className="rl">
                <div>
                  <div className="x">{t.description}</div>
                  <div className="y" style={{ marginTop: 4 }}>
                    {t.deadline_date ? `Needed by ${parseDateOnly(t.deadline_date).toLocaleDateString()}` : "No deadline given"}
                  </div>
                </div>
                <span style={{ marginLeft: "auto" }}>
                  {t.approval_status === "pending" && <Pill variant="b">Pending review</Pill>}
                  {t.approval_status === "rejected" && <Pill variant="n">Declined</Pill>}
                  {t.approval_status === "approved" && (
                    <Pill variant={t.status === "Complete" ? "g" : t.status === "In Progress" ? "a" : "n"}>{t.status}</Pill>
                  )}
                </span>
              </div>
            ))}
            <ClientTaskForm profileId={user!.id} />
          </div>
        )}
      </div>
    </>
  );
}
