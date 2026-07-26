import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getContact } from "@/lib/ghl/client";
import { CONTACT_FIELDS } from "@/lib/ghl/constants";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/badge";

export default async function StaffClientDetailPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, ghl_contact_id, created_at")
    .eq("id", profileId)
    .single();

  if (!profile) notFound();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, business_name, pipeline_stage, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  let portalAccountStatus = "Unknown";
  try {
    const contact = profile.ghl_contact_id ? await getContact(profile.ghl_contact_id) : null;
    const match = contact?.customFields?.find((f: { id: string }) => f.id === CONTACT_FIELDS.portalAccountCreated);
    portalAccountStatus = (match?.value ?? match?.fieldValue) === "Yes" ? "Active" : "Not created";
  } catch {
    // GHL contact lookup failed - not fatal, just show unknown status
  }

  return (
    <div className="min-h-screen">
      <Header userLabel={user?.email ?? undefined} subtitle="Team Portal" />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/staff" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; All clients
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2 mb-6">
          {profile.first_name} {profile.last_name}
        </h1>

        <Card className="p-6 mb-8">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="text-slate-900">{profile.phone || "Not set"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Portal account</dt>
              <dd className="text-slate-900">{portalAccountStatus}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Client since</dt>
              <dd className="text-slate-900">{new Date(profile.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-slate-900">Companies</h2>
          <span className="text-sm text-slate-400">{companies?.length ?? 0}</span>
        </div>

        <div className="grid gap-3">
          {companies?.map((c) => (
            <Link key={c.id} href={`/staff/${profileId}/${c.id}`}>
              <Card className="p-5 flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
                <p className="font-medium text-slate-900">{c.business_name}</p>
                <StageBadge stage={c.pipeline_stage} />
              </Card>
            </Link>
          ))}
          {companies && companies.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-slate-500">No companies yet.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
