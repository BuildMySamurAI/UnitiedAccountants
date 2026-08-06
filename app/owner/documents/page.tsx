import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldFileUrl, customFieldFileUrls } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { STAFF_FILE_FIELDS } from "@/lib/ghl/staff-fields";
import { CLIENT_BOOKKEEPING_FILE_FIELDS, SHARED_BOOKKEEPING_FILE_FIELDS } from "@/lib/ghl/bookkeeping-file-fields";
import { ConsoleTopBar, Pill, EmptyState } from "../_components/ui";

type Row = {
  key: string;
  label: string;
  have: boolean;
  received?: string;
  companyId: string;
  profileId: string;
  companyName: string;
  clientName: string;
};

export default async function DocumentsPage() {
  const supabase = await supabaseServer();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, ghl_opportunity_id, profile_id, profiles(first_name, last_name)")
    .order("created_at", { ascending: true });

  const rows: Row[] = [];

  await Promise.all(
    (companies ?? []).map(async (c) => {
      const profile = c.profiles as unknown as { first_name: string; last_name: string } | null;
      const clientName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Unknown client";

      let opportunity;
      try {
        opportunity = await getOpportunity(c.ghl_opportunity_id);
      } catch {
        return;
      }
      const cf = opportunity.customFields;

      for (const f of STAFF_FILE_FIELDS) {
        const url = customFieldFileUrl(cf, OPPORTUNITY_FIELDS[f.key]);
        rows.push({
          key: `${c.id}-${f.key}`,
          label: f.label,
          have: Boolean(url),
          companyId: c.id,
          profileId: c.profile_id,
          companyName: c.business_name ?? opportunity.name,
          clientName,
        });
      }

      for (const f of [...SHARED_BOOKKEEPING_FILE_FIELDS, ...CLIENT_BOOKKEEPING_FILE_FIELDS]) {
        const entries = customFieldFileUrls(cf, OPPORTUNITY_FIELDS[f.key]);
        if (entries.length === 0) {
          rows.push({
            key: `${c.id}-${f.key}`,
            label: f.label,
            have: false,
            companyId: c.id,
            profileId: c.profile_id,
            companyName: c.business_name ?? opportunity.name,
            clientName,
          });
        } else {
          for (const entry of entries) {
            rows.push({
              key: `${c.id}-${f.key}-${entry.url}`,
              label: f.label,
              have: true,
              received: entry.name,
              companyId: c.id,
              profileId: c.profile_id,
              companyName: c.business_name ?? opportunity.name,
              clientName,
            });
          }
        }
      }
    })
  );

  const missing = rows.filter((r) => !r.have);
  const received = rows.filter((r) => r.have);
  const sorted = [...missing, ...received];

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "Documents" }]} />
      <div className="wrap">
        <h2 className="page">Documents</h2>
        <p className="sub">
          Everything clients and team have uploaded, and everything still outstanding, across every company.
        </p>
        <div className="ccard">
          <header>
            <h3>Practice-wide</h3>
            <span className="hint">
              {rows.length} items - {missing.length} missing
            </span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Company</th>
                <th>Client</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.key} className="click">
                  <td>
                    <Link href={`/owner/contacts/${r.profileId}/${r.companyId}`} style={{ color: "inherit" }}>
                      <b>{r.label}</b>
                    </Link>
                  </td>
                  <td className="mono">{r.companyName}</td>
                  <td>{r.clientName}</td>
                  <td>{r.have ? <Pill variant="g">Received</Pill> : <Pill variant="r">Missing</Pill>}</td>
                  <td className="mono">{r.received ?? "-"}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState title="No documents tracked yet" />
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
