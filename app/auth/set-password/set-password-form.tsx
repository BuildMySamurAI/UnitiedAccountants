"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const GENERIC_ERROR = "Something went wrong - please try again.";
const REQUEST_TIMEOUT_MS = 15_000;

// Rejects if the request hasn't settled in time, so a stalled network call
// can never leave the button stuck on "Saving...".
function withTimeout<T>(promise: PromiseLike<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request timed out")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export default function SetPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

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

    // Stays true only once we have handed off to window.location.assign, so
    // the button keeps saying "Redirecting..." instead of re-enabling.
    let handedOff = false;

    try {
      const supabase = supabaseBrowser();
      const { error } = await withTimeout(supabase.auth.updateUser({ password }));

      if (error) {
        setError(error.message);
        return;
      }

      const {
        data: { user },
      } = await withTimeout(supabase.auth.getUser());

      if (user) {
        // Best-effort - if this fails the account still works, just with a
        // stale "invite pending" badge on the company's Managers list.
        try {
          await withTimeout(supabase.from("managers").update({ status: "active" }).eq("id", user.id));
        } catch {
          // Ignore errors and timeouts - this must never block the login.
        }
      }

      const path = user ? await withTimeout(resolvePostLoginPath(supabase, user.id)) : "/dashboard";

      handedOff = true;
      setRedirecting(true);
      window.location.assign(path);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      if (!handedOff) setSubmitting(false);
    }
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
              {redirecting ? "Redirecting..." : submitting ? "Saving..." : "Create Password"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
