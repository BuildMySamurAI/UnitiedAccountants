"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

// Shared by both portals (clients.uniacc.net and internal.uniacc.net). The
// reset link is sent back to whichever domain the person requested it from,
// via /auth/callback, which then forwards to /auth/set-password.
export default function ForgotPasswordForm({ loginPath }: { loginPath: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = supabaseBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    setSubmitting(false);

    // Only surface rate limiting. Any other result gets the same message so
    // this page can't be used to find out which emails have accounts.
    if (resetError && resetError.status === 429) {
      setError("Too many requests. Please wait a few minutes and try again.");
      return;
    }

    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-lg font-semibold mb-4 shadow-md shadow-emerald-900/20">
            UA
          </span>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Reset your password</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Enter your email and we&apos;ll send you a link to choose a new password.
          </p>
        </div>

        <Card className="p-7">
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-emerald-800 bg-emerald-50 ring-1 ring-inset ring-emerald-100 rounded-lg px-3 py-2.5">
                If that email has an account, we&apos;ve sent a reset link. Check your inbox and spam folder.
              </p>
              <p className="text-sm text-slate-500">
                Open the link in this same browser, and it expires after a short time. If nothing arrives in a few
                minutes, ask your administrator to resend your invite.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-700 bg-red-50 ring-1 ring-inset ring-red-100 rounded-lg px-3 py-2.5">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-sm">
          <a href={loginPath} className="text-emerald-700 hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </main>
  );
}
