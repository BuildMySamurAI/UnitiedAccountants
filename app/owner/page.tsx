import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { InviteTeamMemberForm } from "./invite-form";

export default async function OwnerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("id, full_name, email, created_at")
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, companies(id)")
    .order("created_at", { ascending: false });

  const filtered = q
    ? profiles?.filter((p) => {
        const hay = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      })
    : profiles;

  return (
    <div className="min-h-screen">
      <Header userLabel={user?.email ?? undefined} subtitle="Owner Portal" />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Team</h1>
        <p className="text-sm text-slate-500 mb-6">{teamMembers?.length ?? 0} team members invited</p>

        <Card className="p-6 mb-6">
          <InviteTeamMemberForm />
        </Card>

        <div className="grid gap-3 mb-10">
          {teamMembers?.map((t) => (
            <Card key={t.id} className="p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{t.full_name}</p>
                <p className="text-sm text-slate-500">{t.email}</p>
              </div>
            </Card>
          ))}
          {teamMembers && teamMembers.length === 0 && (
            <Card className="p-10 text-center">
              <p className="text-slate-500">No team members invited yet.</p>
            </Card>
          )}
        </div>

        <h2 className="text-lg font-medium text-slate-900 mb-1">Clients</h2>
        <p className="text-sm text-slate-500 mb-4">Assign a team member to each client's companies</p>

        <form className="mb-6">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name or email..."
            className="w-full max-w-md rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/10 focus:border-emerald-600"
          />
        </form>

        <div className="grid gap-3">
          {filtered?.map((p) => (
            <Link key={p.id} href={`/owner/${p.id}`}>
              <Card className="p-5 flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
                <div>
                  <p className="font-medium text-slate-900">
                    {p.first_name} {p.last_name}
                  </p>
                  <p className="text-sm text-slate-500">{p.email}</p>
                </div>
                <span className="text-sm text-slate-400 shrink-0 ml-3">
                  {p.companies?.length ?? 0} compan{p.companies?.length === 1 ? "y" : "ies"}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
