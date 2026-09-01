import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue, customFieldFileUrls } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { CLIENT_BOOKKEEPING_FILE_FIELDS, SHARED_BOOKKEEPING_FILE_FIELDS } from "@/lib/ghl/bookkeeping-file-fields";
import { ConsoleTopBar, EmptyState } from "@/components/console/ui";
import { EntitySwitch } from "@/components/console/entity-switch";
import { AutoSaveField } from "./auto-save-field";
import DocumentUploader from "./document-uploader";
import { ClientServices } from "./client-services";
import type { ServiceDocRecord } from "@/app/staff/[profileId]/[companyId]/service-row";
import { GoingOutOfBusinessToggle } from "@/components/console/going-out-of-business-toggle";
import { ClientClosingTasks } from "@/components/console/client-closing-tasks";
import { OwnerInformationCard } from "@/components/console/contact-info-panel";

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

  const { data: company } = await supabase
    .from("companies")
    .select("id, ghl_opportunity_id, going_out_of_business")
    .eq("id", companyId)
    .single();

  if (!company) notFound();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("owner_legal_name, owner_ssn, owner_date_of_birth, owner_address")
    .eq("id", user!.id)
    .single();

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

  // The monthly bookkeeping document fields only show up while the cycle is
  // open - hidden entirely once staff locks the month, until the next reset.
  const bookkeepingCycleOpen = field("bookkeepingServiceEnabled") === "Yes" && !field("reconciliationCompletionDate");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, body, created_at")
    .eq("profile_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: siblingCompanies } = await supabase
    .from("companies")
    .select("id, business_name, pipeline_stage")
    .eq("profile_id", user!.id)
    .order("created_at", { ascending: true });

  const [{ data: services }, { data: serviceDocuments }] = await Promise.all([
    supabase
      .from("company_services")
      .select("id, company_id, service_type, subtype, license_number, deadline_date, status")
      .eq("company_id", company.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("company_service_documents")
      .select("id, service_id, year, file_name, storage_path")
      .eq("company_id", company.id),
  ]);
  const documentsByService: Record<string, ServiceDocRecord[]> = {};
  for (const d of serviceDocuments ?? []) {
    (documentsByService[d.service_id] ??= []).push(d);
  }

  const { data: closingTasks } = await supabase
    .from("tasks")
    .select("id, title, status")
    .eq("company_id", company.id)
    .eq("task_type", "closing_process")
    .order("created_at", { ascending: true });
  const closingTaskIds = (closingTasks ?? []).map((t) => t.id);
  const { data: closingTaskDocuments } =
    closingTaskIds.length > 0
      ? await supabase.from("task_documents").select("id, task_id, file_name, storage_path").in("task_id", closingTaskIds)
      : { data: [] };
  const documentsByClosingTask: Record<string, { id: string; task_id: string; file_name: string; storage_path: string }[]> = {};
  for (const d of closingTaskDocuments ?? []) {
    (documentsByClosingTask[d.task_id] ??= []).push(d);
  }

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

  // Same "only show what's actually an active service" rule as the staff
  // side - a service that's off (or never configured) shows none of its
  // facts here either, not just blank ones.
  const facts: [string, string | undefined][] = [
    ["Sunbiz Tracking Number", field("sunbizTrackingNumber")],
    ["Sunbiz Filing Date", field("sunbizFilingDate")],
    ...(field("salesTaxServiceEnabled") === "Yes"
      ? ([
          ["Sales Tax Certificate Number", field("salesTaxCertificateNumber")],
          ["Business Partner Number", field("businessPartnerNumber")],
          ["Sales Tax Filing Frequency", field("salesTaxFilingFrequency")],
          ["Sales Tax Submission Date", field("salesTaxSubmissionDate")],
          ["E-File Sales Tax Added?", field("efileSalesTaxAdded")],
          ["eFileSalesTax Registration Status", field("efileSalesTaxRegistrationStatus")],
        ] as [string, string | undefined][])
      : []),
    ...(field("rtServiceEnabled") === "Yes"
      ? ([
          ["RT Account Number", field("rtAccountNumber")],
          ["RT Filing Frequency", field("rtFilingFrequency")],
          ["RT Submission Date", field("rtSubmissionDate")],
        ] as [string, string | undefined][])
      : []),
    ...(field("payrollServiceEnabled") === "Yes"
      ? ([
          ["Payroll Setup Completion", field("surePayrollSetupCompletion")],
          ["Payroll Filing Frequency", field("payrollFilingFrequency")],
          ["Payroll Processing Date", field("payrollProcessingDate")],
        ] as [string, string | undefined][])
      : []),
  ];

  return (
    <>
      <ConsoleTopBar crumbs={[{ label: "My Companies", href: "/dashboard" }, { label: businessName }]} />
      <div className="wrap">
        <h2 className="page">{businessName}</h2>
        <p className="sub">Share a few business details and upload your documents below. Everything you submit reaches your accountant instantly.</p>

        <EntitySwitch
          ownerName="you"
          companies={siblingCompanies ?? []}
          activeId={company.id}
          hrefFor={(id) => `/dashboard/${id}`}
        />

        <div className="ccard" style={{ marginBottom: 16, background: allDone ? "var(--green-soft)" : "var(--blue-soft)" }}>
          <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, color: "var(--ink)" }}>{allDone ? "Everything's submitted" : "A few things left to complete"}</p>
              <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>
                {allDone
                  ? "Your accountant has what they need. We'll reach out if anything else comes up."
                  : `${completed} of ${total} items complete - finish the rest below.`}
              </p>
            </div>
            <div style={{ width: 110, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.6)", overflow: "hidden", flexShrink: 0 }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  background: allDone ? "var(--green)" : "var(--blue)",
                  width: `${(completed / total) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="detail">
          <div>
            <div className="ccard" style={{ marginBottom: 16 }}>
              <header>
                <h3>Business details</h3>
                <span className="hint">{checklist.slice(0, 3).filter(Boolean).length}/3</span>
              </header>
              <AutoSaveField companyId={company.id} fieldKey="businessName" label="Legal business name" initialValue={businessName ?? ""} />
              <AutoSaveField companyId={company.id} fieldKey="mailingAddress" label="Mailing address" initialValue={mailingAddress} />
              <AutoSaveField companyId={company.id} fieldKey="physicalAddress" label="Physical address" initialValue={physicalAddress} />
              <AutoSaveField companyId={company.id} fieldKey="ein" label="EIN" initialValue={field("ein") ?? ""} mask="ein" placeholder="##-#######" />
              <AutoSaveField companyId={company.id} fieldKey="ssn" label="SSN" initialValue={field("ssn") ?? ""} mask="ssn" placeholder="###-##-####" />
            </div>

            <div className="ccard" style={{ marginBottom: 16 }}>
              <header>
                <h3>Documents</h3>
                <span className="hint">{(formationDocs.length > 0 ? 1 : 0) + (identificationDocs.length > 0 ? 1 : 0)}/2</span>
              </header>
              <DocumentUploader companyId={company.id} fieldKey="formation_documents" label="Formation Documents" existing={formationDocs} />
              <DocumentUploader companyId={company.id} fieldKey="identification_documents" label="Identification Documents" existing={identificationDocs} />
              {einConfirmationLetterUrl && (
                <div className="doc have">
                  <div className="ic">PDF</div>
                  <div style={{ flex: 1 }}>
                    <div className="nm">EIN Confirmation Letter</div>
                  </div>
                  <div className="rt">
                    <a href={einConfirmationLetterUrl} target="_blank" rel="noopener noreferrer" className="cbtn ghost">
                      View
                    </a>
                  </div>
                </div>
              )}
            </div>

            {myProfile && <OwnerInformationCard profileId={user!.id} profile={myProfile} />}

            <ClientServices services={services ?? []} documentsByService={documentsByService} />

            <GoingOutOfBusinessToggle companyId={company.id} initialValue={company.going_out_of_business ?? "No"} createdBy="client" />

            {(company.going_out_of_business === "Yes" || (closingTasks?.length ?? 0) > 0) && (
              <ClientClosingTasks companyId={company.id} tasks={closingTasks ?? []} documentsByTask={documentsByClosingTask} />
            )}

            {bookkeepingCycleOpen && (
              <div className="ccard" style={{ marginBottom: 16 }}>
                <header>
                  <h3>Monthly Bookkeeping Documents</h3>
                  <span className="hint">cycle open</span>
                </header>
                {CLIENT_BOOKKEEPING_FILE_FIELDS.map((f) => (
                  <DocumentUploader
                    key={f.fieldKey}
                    companyId={company.id}
                    fieldKey={f.fieldKey}
                    label={f.label}
                    existing={files?.filter((file) => file.field_key === f.fieldKey) ?? []}
                  />
                ))}
                <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)" }}>
                  <h4 style={{ fontFamily: "var(--console-font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-3)", marginBottom: 8 }}>
                    Provided by your accountant (view only)
                  </h4>
                  {SHARED_BOOKKEEPING_FILE_FIELDS.flatMap((f) =>
                    customFieldFileUrls(cf, OPPORTUNITY_FIELDS[f.key]).map((entry, i) => (
                      <div key={`${f.key}-${i}`} className="doc have">
                        <div className="ic">PDF</div>
                        <div style={{ flex: 1 }}>
                          <div className="nm">{f.label}</div>
                          <div className="mt">{entry.name}</div>
                        </div>
                        <div className="rt">
                          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="cbtn ghost">
                            View
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                  {SHARED_BOOKKEEPING_FILE_FIELDS.every((f) => customFieldFileUrls(cf, OPPORTUNITY_FIELDS[f.key]).length === 0) && (
                    <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Nothing here yet.</p>
                  )}
                </div>
              </div>
            )}

            <div className="ccard">
              <header>
                <h3>Filing status</h3>
                <span className="hint">view only</span>
              </header>
              <div className="facts">
                {facts.map(([k, v]) => (
                  <div key={k} className="fact">
                    <div className="k">{k}</div>
                    <div className={`v ${v ? "" : "miss"}`}>{v || "Not set"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rail">
            <div className="ccard">
              <header>
                <h3>Status</h3>
              </header>
              <div style={{ padding: "14px 15px" }}>
                <p style={{ fontWeight: 600, color: "var(--ink)" }}>{allDone ? "All set" : "In progress"}</p>
                <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
                  {completed} of {total} items complete
                </p>
                <span className={`cpill ${allDone ? "g" : "b"}`} style={{ marginTop: 8, display: "inline-flex" }}>
                  {allDone ? "Complete" : "In progress"}
                </span>
              </div>
            </div>

            <div className="ccard">
              <header>
                <h3>Messages</h3>
              </header>
              {(!notifications || notifications.length === 0) && <EmptyState title="No messages yet" />}
              {notifications?.map((n) => (
                <div key={n.id} className="rl">
                  <div>
                    <div className="x" style={{ fontWeight: 600 }}>
                      {n.title}
                    </div>
                    <div className="x" style={{ marginTop: 2 }}>
                      {n.body}
                    </div>
                    <div className="y" style={{ marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleString("en-US")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
