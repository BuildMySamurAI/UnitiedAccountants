"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default function SetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const path = user ? await resolvePostLoginPath(supabase, user.id) : "/dashboard";

    router.push(path);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-white text-lg font-semibold mb-4">
            UA
          </span>
          <h1 className="text-xl font-semibold text-slate-900">Set your password</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Choose a password to finish setting up your portal account.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" value={email} disabled readOnly className="bg-slate-50 text-slate-500" />
            <Field
              label="New Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <Field
              label="Confirm Password"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Saving..." : "Create Password"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
