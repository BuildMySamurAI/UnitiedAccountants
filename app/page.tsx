import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const host = (await headers()).get("host") ?? "";
    const internalDomain = process.env.NEXT_PUBLIC_INTERNAL_PORTAL_DOMAIN;
    redirect(internalDomain && host.startsWith(internalDomain) ? "/internal/login" : "/login");
  }

  redirect(await resolvePostLoginPath(supabase, user.id));
}
