import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";
import { StageBadge } from "@/components/ui/badge";

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
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-8">
          Here are all the companies linked to your account.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            Could not load companies: {error.message}
          </p>
        )}

        {companies && companies.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-slate-500">No companies yet.</p>
          </Card>
        )}

        <div className="grid gap-3">
          {companies?.map((c) => (
            <Link key={c.id} href={`/dashboard/${c.id}`}>
              <Card className="p-5 flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
                <div>
                  <p className="font-medium text-slate-900">{c.business_name}</p>
                  <div className="mt-2">
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
