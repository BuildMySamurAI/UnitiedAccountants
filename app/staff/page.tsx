import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar, Avatar, MultiEntityBadge, EmptyState } from "@/components/console/ui";

export default async function StaffClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await supabaseServer();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, companies(id)")
    .order("created_at", { ascending: false });

  // profiles itself isn't scoped by assignment, only the embedded companies
  // join is (via RLS) - drop anyone with zero assigned companies so this
  // list, and every link on it, stays within this team member's scope.
  const assigned = profiles?.filter((p) => (p.companies?.length ?? 0) > 0);

  const filtered = q
    ? assigned?.filter((p) => {
        const hay = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : assigned;

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "My Clients" }]} searchAction="/staff" searchDefault={q} searchPlaceholder="Search your clients..." />
      <div className="wrap">
        <h2 className="page">My Clients</h2>
        <p className="sub">{filtered?.length ?? 0} clients with companies assigned to you.</p>

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
