import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";

// /internal has no UI of its own - it's a landing alias. Signed-out users go
// to the internal login; owners/team go to their home. A signed-in client has
// no business on the internal portal, so they go to the internal login too
// (which signs out accounts that aren't owner/team) rather than /dashboard.
export default async function InternalHome() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/internal/login");

  const path = await resolvePostLoginPath(supabase, user.id);
  redirect(path === "/dashboard" ? "/internal/login" : path);
}
