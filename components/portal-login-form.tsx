"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function PortalLoginForm({
  subtitle,
  roleTable,
  redirectPath,
  noAccessMessage,
  footerNote,
}: {
  subtitle: string;
  roleTable: "profiles" | "team_members" | "owners" | ("profiles" | "managers")[];
  redirectPath: string;
  noAccessMessage: string;
  footerNote?: string;
}) {
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

    // A manager's login lives in `managers`, not `profiles` - checking
    // multiple tables lets the Client Portal login accept either identity.
    const tables = Array.isArray(roleTable) ? roleTable : [roleTable];
    let hasAccess = false;
    if (user) {
      for (const table of tables) {
        const { data: roleRow } = await supabase.from(table).select("id").eq("id", user.id).maybeSingle();
        if (roleRow) {
          hasAccess = true;
          break;
        }
      }
    }

    if (!hasAccess) {
      await supabase.auth.signOut();
      setError(noAccessMessage);
      setSubmitting(false);
      return;
    }

    router.push(redirectPath);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-lg font-semibold mb-4 shadow-md shadow-emerald-900/20">
            UA
          </span>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">United Accountants</h1>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>

        <Card className="p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
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

        {footerNote && <p className="mt-6 text-center text-sm text-slate-500">{footerNote}</p>}
      </div>
    </main>
  );
}
