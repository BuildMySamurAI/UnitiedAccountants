import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar, Avatar, MultiEntityBadge, Pill, EmptyState } from "../_components/ui";

const STAGE_PILL: Record<string, "g" | "a" | "b" | "n"> = {
  "Client Onboarding": "b",
  "Sunbiz Filed": "b",
  "EIN Applied": "b",
  "Tax Registrations In Progress": "a",
  "QC Review": "a",
  "Active Client": "g",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await supabaseServer();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, created_at, companies(id, business_name, pipeline_stage)")
    .order("created_at", { ascending: false });

  const f = (q ?? "").toLowerCase();
  const rows = (profiles ?? []).filter((p) => {
    if (!f) return true;
    const hay = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""} ${(p.companies ?? [])
      .map((c) => c.business_name)
      .join(" ")}`.toLowerCase();
    return hay.includes(f);
  });

  return (
    <>
      <ConsoleTopBar
        crumbs={[{ label: "Contacts" }]}
        searchDefault={q}
        actions={
          <Link href="/owner/team" className="cbtn ghost">
            Invite team member
          </Link>
        }
      />
      <div className="wrap">
        <h2 className="page">Contacts</h2>
        <p className="sub">
          {profiles?.length ?? 0} clients synced from the portal. Rows with a stacked badge hold more than one company
          - open them to switch between entities.
        </p>

        <div className="ccard">
          <header>
            <h3>All contacts</h3>
            <span className="hint">{rows.length} shown</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Companies</th>
                <th>Stage</th>
                <th>Client since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const companies = p.companies ?? [];
                const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unnamed";
                const primaryStage = companies[0]?.pipeline_stage ?? null;
                return (
                  <tr key={p.id} className="click">
                    <td>
                      <Link href={`/owner/contacts/${p.id}`} className="person" style={{ color: "inherit" }}>
                        <Avatar name={name} id={p.id} />
                        <div>
                          <div className="name">
                            {name}
                            <MultiEntityBadge count={companies.length} />
                          </div>
                          <div className="meta">{p.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      {companies.length > 1 ? (
                        <div className="meta">{companies.map((c) => c.business_name).join(" · ")}</div>
                      ) : (
                        <span className="mono">{companies[0]?.business_name ?? "No company yet"}</span>
                      )}
                    </td>
                    <td>{primaryStage ? <Pill variant={STAGE_PILL[primaryStage] ?? "n"}>{primaryStage}</Pill> : <Pill variant="n">Unknown</Pill>}</td>
                    <td className="mono">{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No matches" subtitle="Try a name, email, or company." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
