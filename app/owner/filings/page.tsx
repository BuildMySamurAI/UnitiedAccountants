import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { ConsoleTopBar, Pill, EmptyState } from "../_components/ui";

type CompanyRow = {
  companyId: string;
  profileId: string;
  companyName: string;
  salesTaxFrequency?: string;
  salesTaxApproved?: string;
  rtFrequency?: string;
  rtApproved?: string;
  payrollFrequency?: string;
  payrollProcessingDate?: string;
  payrollSetupComplete?: boolean;
};

export default async function FilingsPage() {
  const supabase = await supabaseServer();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, ghl_opportunity_id, profile_id")
    .order("created_at", { ascending: true });

  const rows: CompanyRow[] = [];
  await Promise.all(
    (companies ?? []).map(async (c) => {
      let opportunity;
      try {
        opportunity = await getOpportunity(c.ghl_opportunity_id);
      } catch {
        return;
      }
      const cf = opportunity.customFields;
      rows.push({
        companyId: c.id,
        profileId: c.profile_id,
        companyName: c.business_name ?? opportunity.name,
        salesTaxFrequency: customFieldValue(cf, OPPORTUNITY_FIELDS.salesTaxFilingFrequency),
        salesTaxApproved: customFieldValue(cf, OPPORTUNITY_FIELDS.salesTaxApproved),
        rtFrequency: customFieldValue(cf, OPPORTUNITY_FIELDS.rtFilingFrequency),
        rtApproved: customFieldValue(cf, OPPORTUNITY_FIELDS.rtApproved),
        payrollFrequency: customFieldValue(cf, OPPORTUNITY_FIELDS.payrollFilingFrequency),
        payrollProcessingDate: customFieldValue(cf, OPPORTUNITY_FIELDS.payrollProcessingDate),
        payrollSetupComplete: customFieldValue(cf, OPPORTUNITY_FIELDS.surePayrollSetupCompletion) === "Complete",
      });
    })
  );

  function groupBy(field: "salesTaxFrequency" | "rtFrequency", approvedField: "salesTaxApproved" | "rtApproved") {
    const groups = new Map<string, CompanyRow[]>();
    for (const r of rows) {
      const freq = r[field];
      if (!freq) continue;
      if (!groups.has(freq)) groups.set(freq, []);
      groups.get(freq)!.push(r);
    }
    return [...groups.entries()].map(([freq, list]) => ({
      freq,
      total: list.length,
      ready: list.filter((r) => r[approvedField] === "Approved").length,
    }));
  }

  const salesTaxGroups = groupBy("salesTaxFrequency", "salesTaxApproved");
  const rtGroups = groupBy("rtFrequency", "rtApproved");

  const payrollRows = rows
    .filter((r) => r.payrollProcessingDate)
    .sort((a, b) => new Date(a.payrollProcessingDate!).getTime() - new Date(b.payrollProcessingDate!).getTime());

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "Filing calendar" }]} />
      <div className="wrap">
        <h2 className="page">Filing calendar</h2>
        <p className="sub">
          Payroll processing dates are exact (maintained by the daily reminder job). Sales tax and reemployment tax
          are grouped by filing frequency with a ready-vs-needs-attention count, not exact due dates.
        </p>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Upcoming payroll processing</h3>
            <span className="hint">{payrollRows.length} companies</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Processing date</th>
                <th>Frequency</th>
                <th>Setup</th>
              </tr>
            </thead>
            <tbody>
              {payrollRows.map((r) => (
                <tr key={r.companyId} className="click">
                  <td>
                    <Link href={`/owner/contacts/${r.profileId}/${r.companyId}`} style={{ color: "inherit" }}>
                      <b>{r.companyName}</b>
                    </Link>
                  </td>
                  <td className="mono">{new Date(r.payrollProcessingDate!).toLocaleDateString()}</td>
                  <td className="mono">{r.payrollFrequency ?? "-"}</td>
                  <td>{r.payrollSetupComplete ? <Pill variant="g">Complete</Pill> : <Pill variant="a">Pending</Pill>}</td>
                </tr>
              ))}
              {payrollRows.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No payroll processing dates set" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Sales Tax - by filing frequency</h3>
          </header>
          <table>
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Companies</th>
                <th>Ready</th>
                <th>Needs attention</th>
              </tr>
            </thead>
            <tbody>
              {salesTaxGroups.map((g) => (
                <tr key={g.freq}>
                  <td>
                    <b>{g.freq}</b>
                  </td>
                  <td className="mono">{g.total}</td>
                  <td>
                    <Pill variant="g">{g.ready} ready</Pill>
                  </td>
                  <td>{g.total - g.ready > 0 ? <Pill variant="r">{g.total - g.ready} needs attention</Pill> : <Pill variant="n">none</Pill>}</td>
                </tr>
              ))}
              {salesTaxGroups.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No sales tax filing frequencies set" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ccard">
          <header>
            <h3>Reemployment Tax (RT) - by filing frequency</h3>
          </header>
          <table>
            <thead>
              <tr>
                <th>Frequency</th>
                <th>Companies</th>
                <th>Ready</th>
                <th>Needs attention</th>
              </tr>
            </thead>
            <tbody>
              {rtGroups.map((g) => (
                <tr key={g.freq}>
                  <td>
                    <b>{g.freq}</b>
                  </td>
                  <td className="mono">{g.total}</td>
                  <td>
                    <Pill variant="g">{g.ready} ready</Pill>
                  </td>
                  <td>{g.total - g.ready > 0 ? <Pill variant="r">{g.total - g.ready} needs attention</Pill> : <Pill variant="n">none</Pill>}</td>
                </tr>
              ))}
              {rtGroups.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No RT filing frequencies set" />
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
