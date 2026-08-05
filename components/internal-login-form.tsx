"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function InternalLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = supabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Something went wrong signing in.");
      setSubmitting(false);
      return;
    }

    // Owner takes priority if an account somehow has rows in both tables.
    const { data: ownerRow } = await supabase.from("owners").select("id").eq("id", user.id).maybeSingle();
    if (ownerRow) {
      router.push("/owner");
      router.refresh();
      return;
    }

    const { data: teamRow } = await supabase.from("team_members").select("id").eq("id", user.id).maybeSingle();
    if (teamRow) {
      router.push("/staff");
      router.refresh();
      return;
    }

    await supabase.auth.signOut();
    setError("This account doesn't have access to the internal portal.");
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-lg font-semibold mb-4 shadow-md shadow-emerald-900/20">
            UA
          </span>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">United Accountants</h1>
          <p className="text-sm text-slate-500 mt-1">Internal Portal</p>
        </div>

        <Card className="p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@unitedaccountants.com"
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {error && (
              <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-100 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
