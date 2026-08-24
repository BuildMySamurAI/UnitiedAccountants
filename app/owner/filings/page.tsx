import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { incomeTaxDeadline } from "@/lib/tax-deadline";
import { SERVICE_TYPE_LABEL, type ServiceTypeKey } from "@/lib/services";
import { parseDateOnly } from "@/lib/service-deadlines";
import { ConsoleTopBar, Pill, EmptyState } from "@/components/console/ui";

type CompanyRow = {
  companyId: string;
  profileId: string;
  companyName: string;
  salesTaxEnabled?: boolean;
  salesTaxFrequency?: string;
  salesTaxApproved?: string;
  rtEnabled?: boolean;
  rtFrequency?: string;
  rtApproved?: string;
  payrollEnabled?: boolean;
  payrollFrequency?: string;
  payrollProcessingDate?: string;
  payrollSetupComplete?: boolean;
  entityType?: string;
  extensionFiled?: string;
};

export default async function FilingsPage() {
  const supabase = await supabaseServer();

  // Inactive clients' companies drop off the calendar entirely - there's no
  // more active work to file, and they'd otherwise clutter every table here.
  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, ghl_opportunity_id, profile_id, profiles!inner(status)")
    .eq("profiles.status", "Active")
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
        salesTaxEnabled: customFieldValue(cf, OPPORTUNITY_FIELDS.salesTaxServiceEnabled) === "Yes",
        salesTaxFrequency: customFieldValue(cf, OPPORTUNITY_FIELDS.salesTaxFilingFrequency),
        salesTaxApproved: customFieldValue(cf, OPPORTUNITY_FIELDS.salesTaxApproved),
        rtEnabled: customFieldValue(cf, OPPORTUNITY_FIELDS.rtServiceEnabled) === "Yes",
        rtFrequency: customFieldValue(cf, OPPORTUNITY_FIELDS.rtFilingFrequency),
        rtApproved: customFieldValue(cf, OPPORTUNITY_FIELDS.rtApproved),
        payrollEnabled: customFieldValue(cf, OPPORTUNITY_FIELDS.payrollServiceEnabled) === "Yes",
        payrollFrequency: customFieldValue(cf, OPPORTUNITY_FIELDS.payrollFilingFrequency),
        payrollProcessingDate: customFieldValue(cf, OPPORTUNITY_FIELDS.payrollProcessingDate),
        payrollSetupComplete: customFieldValue(cf, OPPORTUNITY_FIELDS.surePayrollSetupCompletion) === "Complete",
        entityType: customFieldValue(cf, OPPORTUNITY_FIELDS.entityType),
        extensionFiled: customFieldValue(cf, OPPORTUNITY_FIELDS.extensionFiled),
      });
    })
  );

  // Gated by the same *ServiceEnabled flag that controls whether the field
  // group even shows on the company page - a company with old filing-
  // frequency data left over from before a service was turned off shouldn't
  // still show up here as if that service were active.
  function groupBy(
    enabledField: "salesTaxEnabled" | "rtEnabled",
    field: "salesTaxFrequency" | "rtFrequency",
    approvedField: "salesTaxApproved" | "rtApproved"
  ) {
    const groups = new Map<string, CompanyRow[]>();
    for (const r of rows) {
      if (!r[enabledField]) continue;
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

  const salesTaxGroups = groupBy("salesTaxEnabled", "salesTaxFrequency", "salesTaxApproved");
  const rtGroups = groupBy("rtEnabled", "rtFrequency", "rtApproved");

  const payrollRows = rows
    .filter((r) => r.payrollEnabled && r.payrollProcessingDate)
    .sort((a, b) => new Date(a.payrollProcessingDate!).getTime() - new Date(b.payrollProcessingDate!).getTime());

  const incomeTaxRows = rows
    .map((r) => ({ ...r, deadline: incomeTaxDeadline(r.entityType, r.extensionFiled) }))
    .filter((r): r is CompanyRow & { deadline: Date } => r.deadline !== null)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));
  const { data: services } = await supabase
    .from("company_services")
    .select("company_id, service_type, subtype, deadline_date")
    .eq("status", "Active")
    .not("deadline_date", "is", null);

  const serviceRows = (services ?? [])
    .map((s) => {
      const company = companyById.get(s.company_id);
      if (!company) return null;
      return {
        companyId: s.company_id,
        profileId: company.profile_id,
        companyName: company.business_name ?? "",
        label: s.subtype ? `${SERVICE_TYPE_LABEL[s.service_type as ServiceTypeKey]} - ${s.subtype}` : SERVICE_TYPE_LABEL[s.service_type as ServiceTypeKey],
        deadline: parseDateOnly(s.deadline_date as string),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Filing calendar" }]} />
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
            <h3>Upcoming income tax deadlines</h3>
            <span className="hint">{incomeTaxRows.length} companies · from Entity Type + extension status</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Deadline</th>
                <th>Entity Type</th>
                <th>Extension Filed</th>
              </tr>
            </thead>
            <tbody>
              {incomeTaxRows.map((r) => (
                <tr key={r.companyId} className="click">
                  <td>
                    <Link href={`/owner/contacts/${r.profileId}/${r.companyId}`} style={{ color: "inherit" }}>
                      <b>{r.companyName}</b>
                    </Link>
                  </td>
                  <td className="mono">{r.deadline.toLocaleDateString()}</td>
                  <td className="mono">{r.entityType ?? "-"}</td>
                  <td>{r.extensionFiled === "Yes" ? <Pill variant="a">Yes</Pill> : <Pill variant="n">No</Pill>}</td>
                </tr>
              ))}
              {incomeTaxRows.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState title="No entity types set yet" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Upcoming license &amp; permit deadlines</h3>
            <span className="hint">{serviceRows.length} items · DBPR, Corp Renewal, Food Permit, Sales Tax Cert</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Deadline</th>
                <th>Service</th>
              </tr>
            </thead>
            <tbody>
              {serviceRows.map((r) => (
                <tr key={`${r.companyId}-${r.label}`} className="click">
                  <td>
                    <Link href={`/owner/contacts/${r.profileId}/${r.companyId}`} style={{ color: "inherit" }}>
                      <b>{r.companyName}</b>
                    </Link>
                  </td>
                  <td className="mono">{r.deadline.toLocaleDateString()}</td>
                  <td>{r.label}</td>
                </tr>
              ))}
              {serviceRows.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EmptyState title="No service deadlines set yet" />
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
