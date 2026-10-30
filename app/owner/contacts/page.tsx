import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleTopBar, Avatar, MultiEntityBadge, Pill, EmptyState } from "@/components/console/ui";
import { AddClientForm } from "./add-client-form";
import { getAllContacts } from "@/lib/ghl/client";
import { getSelectableTags, isHiddenTag } from "@/lib/tags";

const STAGE_PILL: Record<string, "g" | "a" | "b" | "n"> = {
  "Client Onboarding": "b",
  "Sunbiz Filed": "b",
  "EIN Applied": "b",
  "Tax Registrations In Progress": "a",
  "QC Review": "a",
  "Active Client": "g",
};

type CompanyManager = { legalName: string; ssn: string };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string | string[] }>;
}) {
  const { q, tag } = await searchParams;
  const activeTags = (Array.isArray(tag) ? tag : tag ? [tag] : []).map((t) => t.toLowerCase());
  const supabase = await supabaseServer();

  const [{ data: profiles }, { data: managerAccess }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, ghl_contact_id, created_at, companies(id, business_name, pipeline_stage, ein)")
      .order("created_at", { ascending: false }),
    supabase.from("manager_company_access").select("company_id, managers(legal_name, ssn)"),
  ]);

  // One GHL list call per page load (no per-row lookups); a GHL failure just
  // means no tags are shown, not a broken page.
  const [availableTags, contactTags] = await Promise.all([
    getSelectableTags().catch(() => [] as string[]),
    getAllContacts()
      .then((cs) => new Map<string, string[]>(cs.map((c) => [c.id, c.tags.filter((t) => !isHiddenTag(t))])))
      .catch(() => new Map<string, string[]>()),
  ]);

  const managersByCompany = new Map<string, CompanyManager[]>();
  for (const row of managerAccess ?? []) {
    const mgr = row.managers as unknown as { legal_name: string | null; ssn: string | null } | null;
    if (!mgr?.legal_name) continue;
    const list = managersByCompany.get(row.company_id) ?? [];
    list.push({ legalName: mgr.legal_name, ssn: mgr.ssn ?? "" });
    managersByCompany.set(row.company_id, list);
  }

  const f = (q ?? "").toLowerCase();

  type Row = {
    profileId: string;
    name: string;
    email: string | null;
    createdAt: string;
    companies: { id: string; business_name: string | null; pipeline_stage: string | null }[];
    href: string;
    matchLabel: string | null;
    tags: string[];
  };

  const rows: Row[] = (profiles ?? []).flatMap((p): Row[] => {
    const companyList = p.companies ?? [];
    const tags: string[] = (p.ghl_contact_id ? contactTags.get(p.ghl_contact_id) : undefined) ?? [];
    // Tag filter matches ANY selected tag.
    if (activeTags.length > 0 && !tags.some((t) => activeTags.includes(t.toLowerCase()))) return [];
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || "Unnamed";

    if (!f) {
      return [
        {
          profileId: p.id,
          name,
          email: p.email,
          createdAt: p.created_at,
          companies: companyList,
          href: `/owner/contacts/${p.id}`,
          matchLabel: null,
          tags,
        },
      ];
    }

    // Client-level match (name, email, any business name) - links to the
    // client overview, same as before.
    const clientHaystack = `${name} ${p.email ?? ""} ${companyList.map((c) => c.business_name).join(" ")}`.toLowerCase();
    if (clientHaystack.includes(f)) {
      return [
        {
          profileId: p.id,
          name,
          email: p.email,
          createdAt: p.created_at,
          companies: companyList,
          href: `/owner/contacts/${p.id}`,
          matchLabel: null,
          tags,
        },
      ];
    }

    // Otherwise check each company's EIN and managers - a match here is
    // specific to one company, so it links straight to that company rather
    // than the general client page.
    for (const c of companyList) {
      if (c.ein && c.ein.toLowerCase().includes(f)) {
        return [
          {
            profileId: p.id,
            name,
            email: p.email,
            createdAt: p.created_at,
            companies: companyList,
            href: `/owner/contacts/${p.id}/${c.id}`,
            matchLabel: `Matched EIN ${c.ein} on ${c.business_name ?? "this company"}`,
              tags,
          },
        ];
      }
      for (const m of managersByCompany.get(c.id) ?? []) {
        if (m.legalName.toLowerCase().includes(f) || m.ssn.toLowerCase().includes(f)) {
          return [
            {
              profileId: p.id,
              name,
              email: p.email,
              createdAt: p.created_at,
              companies: companyList,
              href: `/owner/contacts/${p.id}/${c.id}`,
              matchLabel: `Matched manager ${m.legalName}${m.ssn ? ` (SSN ${m.ssn})` : ""} on ${c.business_name ?? "this company"}`,
              tags,
            },
          ];
        }
      }
    }

    return [];
  });

  return (
    <>
      <ConsoleTopBar
        crumbs={[{ label: "Contacts" }]}
        searchAction="/owner/contacts"
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
          {profiles?.length ?? 0} clients synced from the portal. Search matches name, email, business name, EIN, or
          manager name/SSN.
        </p>

        <div style={{ marginBottom: 16 }}>
          <AddClientForm availableTags={availableTags} />
        </div>

        {availableTags.length > 0 && (
          <div className="ccard" style={{ marginBottom: 16 }}>
            <header>
              <h3>Filter by tag</h3>
              <span className="hint">
                matches any selected
                {activeTags.length > 0 && (
                  <>
                    {" · "}
                    <Link href={q ? `/owner/contacts?q=${encodeURIComponent(q)}` : "/owner/contacts"}>clear</Link>
                  </>
                )}
              </span>
            </header>
            <div style={{ padding: "12px 15px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {availableTags.map((t) => {
                const on = activeTags.includes(t.toLowerCase());
                const next = on ? activeTags.filter((a) => a !== t.toLowerCase()) : [...activeTags, t.toLowerCase()];
                const params = new URLSearchParams();
                if (q) params.set("q", q);
                for (const n of next) params.append("tag", n);
                const qs = params.toString();
                return (
                  <Link
                    key={t}
                    href={qs ? `/owner/contacts?${qs}` : "/owner/contacts"}
                    className="ctag"
                    style={{
                      background: on ? "var(--green-soft, #e4efe9)" : undefined,
                      borderColor: on ? "var(--green)" : undefined,
                    }}
                  >
                    {on ? "✓ " : ""}
                    {t}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

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
                <th>Tags</th>
                <th>Stage</th>
                <th>Client since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const primaryStage = p.companies[0]?.pipeline_stage ?? null;
                return (
                  <tr key={p.href} className="click">
                    <td>
                      <Link href={p.href} className="person" style={{ color: "inherit" }}>
                        <Avatar name={p.name} id={p.profileId} />
                        <div>
                          <div className="name">
                            {p.name}
                            <MultiEntityBadge count={p.companies.length} />
                          </div>
                          <div className="meta">{p.matchLabel ?? p.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      {p.companies.length > 1 ? (
                        <div className="meta">{p.companies.map((c) => c.business_name).join(" · ")}</div>
                      ) : (
                        <span className="mono">{p.companies[0]?.business_name ?? "No company yet"}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {p.tags.map((t) => (
                          <span key={t} className="ctag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{primaryStage ? <Pill variant={STAGE_PILL[primaryStage] ?? "n"}>{primaryStage}</Pill> : <Pill variant="n">Unknown</Pill>}</td>
                    <td className="mono">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No matches" subtitle="Try a name, email, business name, EIN, or manager name/SSN." />
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
