import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getOpportunity, getUsers } from "@/lib/ghl/client";
import { customFieldValue } from "@/lib/ghl/fields";
import { OPPORTUNITY_FIELDS } from "@/lib/ghl/constants";
import { STAFF_FIELD_GROUPS } from "@/lib/ghl/staff-fields";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { StaffField } from "./staff-field";
import { AssigneeSelect } from "./assignee-select";

export default async function StaffCompanyPage({
  params,
}: {
  params: Promise<{ profileId: string; companyId: string }>;
}) {
  const { profileId, companyId } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: company } = await supabase
    .from("companies")
    .select("id, ghl_opportunity_id")
    .eq("id", companyId)
    .single();

  if (!company) notFound();

  const [opportunity, users] = await Promise.all([getOpportunity(company.ghl_opportunity_id), getUsers()]);
  const cf = opportunity.customFields;
  const businessName = customFieldValue(cf, OPPORTUNITY_FIELDS.businessName) ?? opportunity.name;

  const { data: files } = await supabase
    .from("files")
    .select("id, field_key, file_name, uploaded_at")
    .eq("company_id", companyId)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <Header userLabel={user?.email ?? undefined} subtitle="Team Portal" />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href={`/staff/${profileId}`} className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Back to client
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2 mb-8">{businessName}</h1>

        <Card className="p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Assignment</h2>
          <div className="divide-y divide-slate-100 mt-3">
            <AssigneeSelect companyId={companyId} users={users} initialValue={opportunity.assignedTo ?? ""} />
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
