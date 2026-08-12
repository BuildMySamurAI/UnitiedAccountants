import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue, customFieldFileUrl, customFieldFileUrls } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS, PIPELINE_STAGES } from "@/lib/ghl/constants";
import { STAFF_FIELD_GROUPS, STAFF_FILE_FIELDS } from "@/lib/ghl/staff-fields";
import { CLIENT_BOOKKEEPING_FILE_FIELDS, SHARED_BOOKKEEPING_FILE_FIELDS } from "@/lib/ghl/bookkeeping-file-fields";
import { StaffField } from "@/app/staff/[profileId]/[companyId]/staff-field";
import { StaffDocument } from "@/app/staff/[profileId]/[companyId]/staff-document";
import { StaffDocumentMulti } from "@/app/staff/[profileId]/[companyId]/staff-document-multi";
import { ServicesPanel } from "@/app/staff/[profileId]/[companyId]/services-panel";
import type { ServiceDocRecord } from "@/app/staff/[profileId]/[companyId]/service-row";
import { ManagersPanel, type ManagerRecord } from "@/app/staff/[profileId]/[companyId]/managers-panel";
import { CompanyTasksPanel } from "@/components/console/company-tasks-panel";
import type { TaskDocRecord } from "@/components/console/task-row";
import { ConsoleTopBar, Pill, StageProgress } from "@/components/console/ui";
import { EntitySwitch } from "@/components/console/entity-switch";
import { AssignSelect } from "../../../assign-select";
import { DeleteCompanyButton } from "./delete-company-button";

const STAGE_PILL: Record<string, "g" | "a" | "b" | "n"> = {
  "Client Onboarding": "b",
  "Sunbiz Filed": "b",
  "EIN Applied": "b",
  "Tax Registrations In Progress": "a",
  "QC Review": "a",
  "Active Client": "g",
};

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ profileId: string; companyId: string }>;
}) {
  const { profileId, companyId } = await params;
  const supabase = await supabaseServer();

  const [{ data: profile }, { data: company }, { data: teamMembers }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name").eq("id", profileId).single(),
    supabase
      .from("companies")
      .select("id, ghl_opportunity_id, assigned_team_member_id")
      .eq("id", companyId)
      .single(),
    supabase.from("team_members").select("id, full_name").order("full_name", { ascending: true }),
  ]);

  if (!company) notFound();

  const opportunity = await getOpportunity(company.ghl_opportunity_id);
  const cf = opportunity.customFields;
  const businessName = customFieldValue(cf, OPPORTUNITY_FIELDS.businessName) ?? opportunity.name;
  const bookkeepingCycleOpen = customFieldValue(cf, OPPORTUNITY_FIELDS.monthLocked) !== "Yes";
  const qcPassed = customFieldValue(cf, OPPORTUNITY_FIELDS.qcPassed);
  const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === opportunity.pipelineStageId);
  const stageName = stageIndex >= 0 ? PIPELINE_STAGES[stageIndex].name : "Unknown";

  const { data: files } = await supabase
    .from("files")
    .select("id, field_key, file_name, uploaded_at")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });

  const [{ data: services }, { data: serviceDocuments }] = await Promise.all([
    supabase
      .from("company_services")
      .select("id, company_id, service_type, subtype, license_number, deadline_date, status")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
    supabase
      .from("company_service_documents")
      .select("id, service_id, year, file_name, storage_path")
      .eq("company_id", companyId),
  ]);
  const documentsByService: Record<string, ServiceDocRecord[]> = {};
  for (const d of serviceDocuments ?? []) {
    (documentsByService[d.service_id] ??= []).push(d);
  }

  const { data: managerAccess } = await supabase
    .from("manager_company_access")
    .select("manager_id, managers(email, invited_name, legal_name, status)")
    .eq("company_id", companyId);
  const managers: ManagerRecord[] = (managerAccess ?? []).map((m) => {
    const mgr = m.managers as unknown as { email: string; invited_name: string | null; legal_name: string | null; status: string } | null;
    return {
      managerId: m.manager_id,
      email: mgr?.email ?? "",
      name: mgr?.legal_name || mgr?.invited_name || "",
      status: (mgr?.status ?? "invited") as ManagerRecord["status"],
    };
  });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, company_id, profile_id, title, description, required, assigned_to, deadline_date, status, completed_at, created_by")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  const taskIds = (tasks ?? []).map((t) => t.id);
  const { data: taskDocuments } =
    taskIds.length > 0
      ? await supabase.from("task_documents").select("id, task_id, file_name, storage_path").in("task_id", taskIds)
      : { data: [] };
  const documentsByTask: Record<string, TaskDocRecord[]> = {};
  for (const d of taskDocuments ?? []) {
    (documentsByTask[d.task_id] ??= []).push(d);
  }

  const assignedTeamMemberForCompany = (teamMembers ?? []).find((m) => m.id === company.assigned_team_member_id) ?? null;

  const { data: siblingCompanies } = await supabase
    .from("companies")
    .select("id, business_name, pipeline_stage")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  const clientName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Client";

  return (
    <>
      <ConsoleTopBar
        searchAction="/owner/contacts"
        crumbs={[
          { label: "Contacts", href: "/owner/contacts" },
          { label: clientName, href: `/owner/contacts/${profileId}` },
          { label: businessName },
        ]}
      />
      <div className="wrap">
        <h2 className="page">{businessName}</h2>
        <p className="sub">Owned by {clientName}</p>

        <EntitySwitch
          ownerName={clientName}
          companies={siblingCompanies ?? []}
          activeId={companyId}
          hrefFor={(id) => `/owner/contacts/${profileId}/${id}`}
        />

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Pipeline position</h3>
            <span className="hint">
              <Pill variant={STAGE_PILL[stageName] ?? "n"}>{stageName}</Pill>
            </span>
          </header>
          <div style={{ padding: "16px 15px" }}>
            <StageProgress stages={PIPELINE_STAGES.map((s) => s.name)} currentIndex={Math.max(stageIndex, 0)} />
          </div>
        </div>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Assignment</h3>
          </header>
          <div style={{ padding: "14px 15px" }}>
            <AssignSelect companyId={companyId} teamMembers={teamMembers ?? []} initialValue={company.assigned_team_member_id ?? ""} />
          </div>
        </div>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>QC Passed?</h3>
          </header>
          <div style={{ padding: "14px 15px", fontSize: 13 }}>
            <b>{qcPassed || "Not set"}</b>
            <span style={{ color: "var(--ink-3)" }}> - set automatically by an automated workflow, view only</span>
          </div>
        </div>

        {STAFF_FIELD_GROUPS.map((group) => (
          <div key={group.title} className="ccard" style={{ marginBottom: 16 }}>
            <header>
              <h3>{group.title}</h3>
            </header>
            <div style={{ padding: "4px 15px" }}>
              {group.fields.map((f) => {
                const raw = customFieldValue(cf, OPPORTUNITY_FIELDS[f.key]) ?? "";
                const value = f.type === "date" && raw ? raw.slice(0, 10) : raw;
                return (
                  <StaffField
                    key={f.key}
                    companyId={companyId}
                    ghlFieldId={OPPORTUNITY_FIELDS[f.key]}
                    dbColumn={f.dbColumn}
                    label={f.label}
                    type={f.type}
                    options={f.options}
                    initialValue={value}
                  />
                );
              })}
            </div>
          </div>
        ))}

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Documents (team-provided)</h3>
            <span className="hint">upload as filings come back</span>
          </header>
          <div style={{ padding: "4px 15px" }}>
            {STAFF_FILE_FIELDS.map((f) => (
              <StaffDocument
                key={f.key}
                companyId={companyId}
                ghlFieldId={OPPORTUNITY_FIELDS[f.key]}
                label={f.label}
                initialUrl={customFieldFileUrl(cf, OPPORTUNITY_FIELDS[f.key])}
              />
            ))}
          </div>
        </div>

        <ServicesPanel companyId={companyId} services={services ?? []} documentsByService={documentsByService} />

        <ManagersPanel companyId={companyId} managers={managers} />

        <CompanyTasksPanel companyId={companyId} tasks={tasks ?? []} documentsByTask={documentsByTask} assignedTeamMember={assignedTeamMemberForCompany} />

        {bookkeepingCycleOpen && (
          <div className="ccard" style={{ marginBottom: 16 }}>
            <header>
              <h3>Monthly Bookkeeping Documents</h3>
              <span className="hint">cycle open</span>
            </header>
            <div style={{ padding: "4px 15px" }}>
              {SHARED_BOOKKEEPING_FILE_FIELDS.map((f) => (
                <StaffDocumentMulti
                  key={f.key}
                  companyId={companyId}
                  ghlFieldId={OPPORTUNITY_FIELDS[f.key]}
                  label={f.label}
                  existing={customFieldFileUrls(cf, OPPORTUNITY_FIELDS[f.key])}
                />
              ))}
            </div>
            <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)" }}>
              <h4 style={{ fontFamily: "var(--console-font-mono)", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-3)", marginBottom: 8 }}>
                Client-uploaded (view only)
              </h4>
              {CLIENT_BOOKKEEPING_FILE_FIELDS.flatMap((f) =>
                customFieldFileUrls(cf, OPPORTUNITY_FIELDS[f.key]).map((entry, i) => (
                  <div key={`${f.key}-${i}`} className="doc have">
                    <div className="ic">PDF</div>
                    <div>
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
              {CLIENT_BOOKKEEPING_FILE_FIELDS.every((f) => customFieldFileUrls(cf, OPPORTUNITY_FIELDS[f.key]).length === 0) && (
                <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Nothing uploaded yet.</p>
              )}
            </div>
          </div>
        )}

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Client-uploaded documents</h3>
          </header>
          {files && files.length === 0 && <p style={{ padding: "14px 15px", fontSize: 12, color: "var(--ink-3)" }}>Nothing uploaded yet.</p>}
          {files?.map((f) => (
            <div key={f.id} className="rl">
              <div className="x">{f.file_name}</div>
              <span className="y" style={{ marginLeft: "auto" }}>
                {f.field_key.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </div>

        <DeleteCompanyButton companyId={companyId} companyName={businessName} profileId={profileId} />
      </div>
    </>
  );
}
