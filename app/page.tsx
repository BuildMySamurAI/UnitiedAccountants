import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  redirect(await resolvePostLoginPath(supabase, user.id));
}
