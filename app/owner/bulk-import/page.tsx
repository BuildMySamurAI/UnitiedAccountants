import { ConsoleTopBar } from "@/components/console/ui";
import { ImportForm } from "./import-form";

// A bulk import can involve a long chain of sequential GHL API calls (one
// contact + one opportunity + a full provisioning pass per row) - default
// serverless limits are too short for more than a handful of rows, so this
// pushes the ceiling as far as the hosting plan allows. Still worth
// importing in batches of a few dozen rather than hundreds at once.
export const maxDuration = 300;

export default function BulkImportPage() {
  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Bulk Import" }]} />
      <div className="wrap">
        <h2 className="page">Bulk Import</h2>
        <p className="sub">
          Bring in existing clients from a spreadsheet - nothing you fill in ever leaves this portal. Download the
          template, fill in one row per client, then upload it below. Each row creates that client's portal login,
          their company record, and their GHL contact/opportunity, the same as if they'd signed up through the
          intake form themselves.
        </p>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>1. Get the template</h3>
          </header>
          <div style={{ padding: "14px 15px", fontSize: 13 }}>
            <a href="/client-import-template.csv" download className="cbtn ghost">
              Download CSV Template
            </a>
            <div style={{ marginTop: 12, color: "var(--ink-3)" }}>
              <p style={{ margin: "0 0 6px" }}>Columns, in order:</p>
              <p style={{ margin: 0, fontFamily: "var(--console-font-mono)", fontSize: 11.5 }}>
                First Name, Last Name, Email, Phone, Business Name, Mailing Address, Physical Address, Type, Entity
                Type, Services
              </p>
              <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                <li>
                  <b>Type</b> - <code>Company</code> or <code>Personal</code>. Leave blank for Company.
                </li>
                <li>
                  <b>Entity Type</b> - <code>S-Corp</code>, <code>C-Corp</code>, or <code>Partnership</code> for a
                  Company; <code>Individual</code> for Personal. Leave blank if unknown yet.
                </li>
                <li>
                  <b>Services</b> - any of <code>Bookkeeping</code>, <code>Sales Tax</code>, <code>Payroll/ RT</code>,{" "}
                  <code>Income tax</code>, comma-separated in one cell (e.g. <code>Bookkeeping,Income tax</code>).
                  Leave blank if none apply yet.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="ccard">
          <header>
            <h3>2. Upload it back</h3>
          </header>
          <div style={{ padding: "14px 15px" }}>
            <ImportForm />
          </div>
        </div>
      </div>
    </>
  );
}
