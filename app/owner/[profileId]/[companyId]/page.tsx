import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity } from "@/lib/ghl/client";
import { customFieldValue, customFieldFileUrl } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { STAFF_FIELD_GROUPS, STAFF_FILE_FIELDS } from "@/lib/ghl/staff-fields";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { CompanyTabs } from "@/components/company-tabs";
import { ClientSwitcher } from "@/components/client-switcher";
import { StaffField } from "@/app/staff/[profileId]/[companyId]/staff-field";
import { StaffDocument } from "@/app/staff/[profileId]/[companyId]/staff-document";
import { AssignSelect } from "../../assign-select";

export default async function OwnerCompanyPage({
  params,
}: {
  params: Promise<{ profileId: string; companyId: string }>;
}) {
  const { profileId, companyId } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: company }, { data: teamMembers }, { data: allProfiles }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, ghl_opportunity_id, assigned_team_member_id")
      .eq("id", companyId)
      .single(),
    supabase.from("team_members").select("id, full_name").order("full_name", { ascending: true }),
    supabase.from("profiles").select("id, first_name, last_name").order("created_at", { ascending: false }),
  ]);

  if (!company) notFound();

  const opportunity = await getOpportunity(company.ghl_opportunity_id);
  const cf = opportunity.customFields;
  const businessName = customFieldValue(cf, OPPORTUNITY_FIELDS.businessName) ?? opportunity.name;

  const { data: files } = await supabase
    .from("files")
    .select("id, field_key, file_name, uploaded_at")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });

  const { data: siblingCompanies } = await supabase
    .from("companies")
    .select("id, business_name")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  const clientOptions = (allProfiles ?? []).map((p) => ({
    id: p.id,
    label: `${p.first_name} ${p.last_name}`,
  }));

  return (
    <div className="min-h-screen">
      <Header userLabel={user?.email ?? undefined} subtitle="Owner Portal" />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href={`/owner/${profileId}`} className="text-sm text-slate-500 hover:text-slate-700">
            &larr; Back to client
          </Link>
          {clientOptions.length > 1 && (
            <ClientSwitcher clients={clientOptions} activeId={profileId} basePath="/owner" />
          )}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2 mb-4">{businessName}</h1>

        <CompanyTabs
          companies={siblingCompanies ?? []}
          activeId={companyId}
          hrefFor={(id) => `/owner/${profileId}/${id}`}
        />

        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Assignment</h2>
          <div className="mt-3">
            <AssignSelect
              companyId={companyId}
              teamMembers={teamMembers ?? []}
              initialValue={company.assigned_team_member_id ?? ""}
            />
          </div>
        </Card>

        {STAFF_FIELD_GROUPS.map((group) => (
          <Card key={group.title} className="p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">{group.title}</h2>
            <div className="divide-y divide-slate-100 mt-3">
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
          </Card>
        ))}

        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Documents (team-provided)</h2>
          <p className="text-sm text-slate-500 mb-3">Upload as filings come back from Sunbiz/IRS/DOR</p>
          <div className="divide-y divide-slate-100">
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
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Client-uploaded documents</h2>
          {files && files.length === 0 && <p className="text-sm text-slate-400">Nothing uploaded yet.</p>}
          <ul className="space-y-1.5">
            {files?.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{f.file_name}</span>
                <span className="text-slate-400">{f.field_key.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </div>
  );
}
