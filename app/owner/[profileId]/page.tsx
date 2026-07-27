import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/badge";
import { AssignSelect } from "../assign-select";

export default async function OwnerClientDetailPage({
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
    .select("id, first_name, last_name, email, phone")
    .eq("id", profileId)
    .single();

  if (!profile) notFound();

  const [{ data: companies }, { data: teamMembers }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, business_name, pipeline_stage, assigned_team_member_id")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true }),
    supabase.from("team_members").select("id, full_name").order("full_name", { ascending: true }),
  ]);

  return (
    <div className="min-h-screen">
      <Header userLabel={user?.email ?? undefined} subtitle="Owner Portal" />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/owner" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; All clients
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mt-2 mb-1">
          {profile.first_name} {profile.last_name}
        </h1>
        <p className="text-sm text-slate-500 mb-8">{profile.email}</p>

        <h2 className="text-lg font-medium text-slate-900 mb-4">Companies</h2>

        <div className="grid gap-3">
          {companies?.map((c) => (
            <Card key={c.id} className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">{c.business_name}</p>
                <div className="mt-1.5">
                  <StageBadge stage={c.pipeline_stage} />
                </div>
              </div>
              <AssignSelect
                companyId={c.id}
                teamMembers={teamMembers ?? []}
                initialValue={c.assigned_team_member_id ?? ""}
              />
            </Card>
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
