import { ConsoleTopBar } from "@/components/console/ui";
import { ImportForm } from "./import-form";

// A bulk import can involve a long chain of sequential GHL API calls (one
// contact + one opportunity + a full provisioning pass per row) - default
// serverless limits are too short for more than a handful of rows, so this
// pushes the ceiling as far as the hosting plan allows. Still worth
// importing in batches of a few dozen rather than hundreds at once.
export const maxDuration = 300;

// No downloadable template lives here on purpose - the firm distributes it
// to clients themselves, outside the portal, and only the filled-in result
// ever comes back here. This card is just a reference for the format the
// upload expects, for whoever's doing the uploading.
export default function BulkImportPage() {
  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Bulk Import" }]} />
      <div className="wrap">
        <h2 className="page">Bulk Import</h2>
        <p className="sub">
          Bring in existing clients from a spreadsheet - nothing here ever leaves this portal. Upload a CSV with one
          row per client, and each row creates that client&apos;s portal login, their company record, and their GHL
          contact/opportunity, the same as if they&apos;d signed up through the intake form themselves.
        </p>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Expected columns</h3>
          </header>
          <div style={{ padding: "14px 15px", fontSize: 13, color: "var(--ink-3)" }}>
            <p style={{ margin: 0, fontFamily: "var(--console-font-mono)", fontSize: 11.5 }}>
              First Name, Last Name, Email, Phone, Business Name, Mailing Address, Physical Address, Type, Entity
              Type, Bookkeeping, Sales Tax, Payroll/RT, Income Tax, EIN
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
                <b>Bookkeeping / Sales Tax / Payroll/RT / Income Tax</b> - <code>Yes</code> or <code>No</code>, one
                column per service.
              </li>
              <li>
                <b>EIN</b> - optional, only if already on file. SSN is deliberately not a column here - add it per
                client through the company page after import, where it&apos;s masked and every view is logged.
              </li>
            </ul>
          </div>
        </div>

        <div className="ccard">
          <header>
            <h3>Upload</h3>
          </header>
          <div style={{ padding: "14px 15px" }}>
            <ImportForm />
          </div>
        </div>
      </div>
    </>
  );
}
