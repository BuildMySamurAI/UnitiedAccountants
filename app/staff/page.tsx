import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar, Avatar, MultiEntityBadge, EmptyState } from "@/components/console/ui";

export default async function StaffClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mine?: string }>;
}) {
  const { q, mine } = await searchParams;
  const onlyMine = mine === "1";
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const myId = user?.id ?? "";

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, companies(id, assigned_team_member_id, bookkeeping_assigned_team_member_id, sales_tax_assigned_team_member_id, payroll_rt_assigned_team_member_id, income_tax_assigned_team_member_id)"
    )
    .order("created_at", { ascending: false });

  // Every team member sees every client. "Assigned to me" narrows to clients
  // with a company assigned to this person (company-level or any service).
  const isMine = (c: {
    assigned_team_member_id: string | null;
    bookkeeping_assigned_team_member_id: string | null;
    sales_tax_assigned_team_member_id: string | null;
    payroll_rt_assigned_team_member_id: string | null;
    income_tax_assigned_team_member_id: string | null;
  }) =>
    [
      c.assigned_team_member_id,
      c.bookkeeping_assigned_team_member_id,
      c.sales_tax_assigned_team_member_id,
      c.payroll_rt_assigned_team_member_id,
      c.income_tax_assigned_team_member_id,
    ].includes(myId);

  const assigned = onlyMine ? profiles?.filter((p) => (p.companies ?? []).some(isMine)) : profiles;

  const filtered = q
    ? assigned?.filter((p) => {
        const hay = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : assigned;

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "Clients" }]} searchAction="/staff" searchDefault={q} searchPlaceholder="Search clients..." />
      <div className="wrap">
        <h2 className="page">Clients</h2>
        <p className="sub">
          {filtered?.length ?? 0} {onlyMine ? "clients assigned to you." : "clients."}{" "}
          <Link href={onlyMine ? "/staff" : "/staff?mine=1"} style={{ color: "var(--green, #047857)", textDecoration: "underline" }}>
            {onlyMine ? "Show all clients" : "Assigned to me"}
          </Link>
        </p>

        {error && (
          <p style={{ fontSize: 13, color: "var(--red)", background: "var(--red-soft)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
            {error.message}
          </p>
        )}

        <div className="ccard">
          <header>
            <h3>Clients</h3>
            <span className="hint">{filtered?.length ?? 0} shown</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Companies</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((p) => {
                const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unnamed";
                const count = p.companies?.length ?? 0;
                return (
                  <tr key={p.id} className="click">
                    <td>
                      <Link href={`/staff/${p.id}`} className="person" style={{ color: "inherit" }}>
                        <Avatar name={name} id={p.id} />
                        <div>
                          <div className="name">
                            {name}
                            <MultiEntityBadge count={count} />
                          </div>
                          <div className="meta">{p.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="mono">
                      {count} compan{count === 1 ? "y" : "ies"}
                    </td>
                  </tr>
                );
              })}
              {filtered && filtered.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <EmptyState title="No clients found" />
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
