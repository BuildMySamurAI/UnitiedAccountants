import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/badge";

function BuildingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 21h18M6 21V5a1 1 0 011-1h6a1 1 0 011 1v16M18 21V10a1 1 0 00-1-1h-3M9 7h.01M9 10h.01M9 13h.01M9 16h.01"
      />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, business_name, pipeline_stage, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen">
      <Header userLabel={user.email ?? undefined} />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 mb-8">
          Here are all the companies linked to your account.
        </p>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-100 rounded-lg px-4 py-3 mb-6">
            Could not load companies: {error.message}
          </p>
        )}

        {companies && companies.length === 0 && (
          <Card className="p-12 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3">
              <BuildingIcon />
            </span>
            <p className="text-slate-500 text-sm">No companies yet.</p>
            <p className="text-slate-400 text-xs mt-1">Your accountant will add one as soon as onboarding starts.</p>
          </Card>
        )}

        <div className="grid gap-3">
          {companies?.map((c) => (
            <Link key={c.id} href={`/dashboard/${c.id}`}>
              <Card className="p-5 flex items-center gap-4 hover:border-slate-300/90 hover:shadow-md hover:-translate-y-px transition-all">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <BuildingIcon />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{c.business_name}</p>
                  <div className="mt-1.5">
                    <StageBadge stage={c.pipeline_stage} />
                  </div>
                </div>
                <span className="text-slate-300">&rarr;</span>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
