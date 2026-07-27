import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { CompanyTabs } from "@/components/company-tabs";
import { AutoSaveField } from "./auto-save-field";
import DocumentUploader from "./document-uploader";

const CheckCircleIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, ghl_opportunity_id")
    .eq("id", companyId)
    .single();

  if (!company) notFound();

  // Read live from GHL - staff update these fields directly in GHL and we
  // don't yet have a reverse-sync webhook, so the Supabase cache for
  // anything beyond business_name/mailing/physical address can be stale.
  const opportunity = await getOpportunity(company.ghl_opportunity_id);
  const cf = opportunity.customFields;
  const field = (key: keyof typeof OPPORTUNITY_FIELDS) => customFieldValue(cf, OPPORTUNITY_FIELDS[key]);

  const businessName = field("businessName") ?? opportunity.name;
  const mailingAddress = field("mailingAddress") ?? "";
  const physicalAddress = field("physicalAddress") ?? "";
  const einConfirmationLetterUrl = field("einConfirmationLetter");

  const { data: files } = await supabase
    .from("files")
    .select("id, field_key, file_name, storage_path, uploaded_at")
    .eq("company_id", company.id)
    .order("uploaded_at", { ascending: false });

  const formationDocs = files?.filter((f) => f.field_key === "formation_documents") ?? [];
  const identificationDocs = files?.filter((f) => f.field_key === "identification_documents") ?? [];

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: siblingCompanies } = await supabase
    .from("companies")
    .select("id, business_name")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  const checklist = [
    Boolean(businessName?.trim()),
    Boolean(mailingAddress?.trim()),
    Boolean(physicalAddress?.trim()),
    formationDocs.length > 0,
    identificationDocs.length > 0,
  ];
  const completed = checklist.filter(Boolean).length;
  const total = checklist.length;
  const allDone = completed === total;

  return (
    <div className="min-h-screen">
      <Header userLabel={user.email ?? undefined} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to companies
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2 mb-1">{businessName}</h1>
        <p className="text-sm text-slate-500 mb-4">
          Share a few business details and upload your documents below. Everything you submit
          reaches your accountant instantly.
        </p>

        <CompanyTabs
          companies={siblingCompanies ?? []}
          activeId={company.id}
          hrefFor={(id) => `/dashboard/${id}`}
        />

        <Card
          className={`p-5 mb-8 flex items-center gap-3 ${
            allDone ? "bg-emerald-50/60 border-emerald-200" : "bg-blue-50/60 border-blue-200"
          }`}
        >
          <span className={allDone ? "text-emerald-600" : "text-blue-600"}>
            <CheckCircleIcon />
          </span>
          <div>
            <p className="font-medium text-slate-900">
              {allDone ? "Everything's submitted" : "A few things left to complete"}
            </p>
            <p className="text-sm text-slate-600">
              {allDone
                ? "Your accountant has what they need. We'll reach out if anything else comes up."
                : `${completed} of ${total} items complete - finish the rest below.`}
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-slate-900">Business details</h2>
                <span className="text-sm text-slate-400">3/3</span>
              </div>
              <div className="divide-y divide-slate-100">
                <AutoSaveField
                  companyId={company.id}
                  fieldKey="businessName"
                  label="Legal business name"
                  initialValue={businessName ?? ""}
                />
                <AutoSaveField
                  companyId={company.id}
                  fieldKey="mailingAddress"
                  label="Mailing address"
                  initialValue={mailingAddress}
                />
                <AutoSaveField
                  companyId={company.id}
                  fieldKey="physicalAddress"
                  label="Physical address"
                  initialValue={physicalAddress}
                />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-slate-900">Documents</h2>
                <span className="text-sm text-slate-400">
                  {(formationDocs.length > 0 ? 1 : 0) + (identificationDocs.length > 0 ? 1 : 0)}/2
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                <DocumentUploader
                  companyId={company.id}
                  fieldKey="formation_documents"
                  label="Formation Documents"
                  existing={formationDocs}
                />
                <DocumentUploader
                  companyId={company.id}
                  fieldKey="identification_documents"
                  label="Identification Documents"
                  existing={identificationDocs}
                />
              </div>
              {einConfirmationLetterUrl && (
                <div className="pt-4 mt-1 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">EIN Confirmation Letter</span>
                  <a
                    href={einConfirmationLetterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    View
                  </a>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">Filing status</h2>
              <p className="text-sm text-slate-500 mb-4">Maintained by your accountant - view only</p>
              <div className="space-y-6">
                <ReadOnlyGroup
                  title="Sunbiz"
                  rows={[
                    ["Filing Confirmation", field("sunbizFilingConfirmation")],
                    ["Tracking Number", field("sunbizTrackingNumber")],
                    ["Filing Date", field("sunbizFilingDate")],
                  ]}
                />
                <ReadOnlyGroup title="EIN" rows={[["EIN", field("ein")]]} />
                <ReadOnlyGroup
                  title="Sales Tax"
                  rows={[
                    ["Certificate Number", field("salesTaxCertificateNumber")],
                    ["Business Partner Number", field("businessPartnerNumber")],
                    ["Filing Frequency", field("salesTaxFilingFrequency")],
                    ["Submission Date", field("salesTaxSubmissionDate")],
                  ]}
                />
                <ReadOnlyGroup
                  title="eFileSalesTax"
                  rows={[
                    ["Username", field("efileSalesTaxUsername")],
                    ["Registration Status", field("efileSalesTaxRegistrationStatus")],
                  ]}
                />
                <ReadOnlyGroup
                  title="Reemployment Tax (RT)"
                  rows={[
                    ["Account Number", field("rtAccountNumber")],
                    ["Filing Frequency", field("rtFilingFrequency")],
                    ["Submission Date", field("rtSubmissionDate")],
                  ]}
                />
                <ReadOnlyGroup
                  title="Payroll (SurePayroll)"
                  rows={[
                    ["Setup Completion", field("surePayrollSetupCompletion")],
                    ["Deposit Schedule", field("surePayrollDepositSchedule")],
                    ["Filing Frequency", field("payrollFilingFrequency")],
                  ]}
                  last
                />
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-5 flex items-center gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                  allDone ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                <CheckCircleIcon className="h-10 w-10" />
              </span>
              <div>
                <p className="font-medium text-slate-900">{allDone ? "All set" : "In progress"}</p>
                <p className="text-sm text-slate-500">
                  {completed} of {total} items complete
                </p>
                <span
                  className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    allDone ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {allDone ? "Complete" : "In progress"}
                </span>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-medium text-slate-900 mb-3">Messages</h3>
              {(!notifications || notifications.length === 0) && (
                <p className="text-sm text-slate-400">No messages yet.</p>
              )}
              <ul>
                {notifications?.map((n, i) => (
                  <li key={n.id} className={i > 0 ? "pt-3 mt-3 border-t border-slate-100" : ""}>
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-sm text-slate-500">{n.body}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function ReadOnlyGroup({
  title,
  rows,
  last = false,
}: {
  title: string;
  rows: [string, string | undefined][];
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "pb-6 border-b border-slate-100"}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className={value ? "text-slate-900" : "text-slate-300"}>{value || "Not set"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
