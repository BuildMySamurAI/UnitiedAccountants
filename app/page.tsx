import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";

// Unauthenticated visits never reach this component - middleware's
// host-aware catch-all redirects them to /login or /internal/login first.
export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  redirect(await resolvePostLoginPath(supabase, user.id));
}
