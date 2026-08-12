"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

// Supabase's admin-generated links (invite, magic link) deliver tokens as a
// URL fragment (#access_token=...), which never reaches the server - so this
// has to run client-side. A `?code=` param is also handled as a fallback in
// case a future flow (e.g. a browser-initiated PKCE sign-in) lands here.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Managers have one extra step (personal details) before password setup
    // - everyone else goes straight to /auth/set-password as before.
    async function nextStep(supabase: ReturnType<typeof supabaseBrowser>): Promise<string> {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return "/auth/set-password";

      const { data: manager } = await supabase.from("managers").select("id").eq("id", user.id).maybeSingle();
      return manager ? "/auth/manager-details" : "/auth/set-password";
    }

    async function run() {
      const supabase = supabaseBrowser();

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setError(error.message);
          return;
        }
        router.replace(await nextStep(supabase));
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError(error.message);
          return;
        }
        router.replace(await nextStep(supabase));
        return;
      }

      setError("This invite link is invalid or has expired.");
    }

    run();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-600 font-medium mb-2">{error}</p>
            <a href="/login" className="text-sm text-emerald-700 hover:underline">
              Go to login
            </a>
          </>
        ) : (
          <p className="text-slate-500">Signing you in...</p>
        )}
      </div>
    </main>
  );
}
