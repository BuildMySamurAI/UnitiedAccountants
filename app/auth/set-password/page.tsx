import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import SetPasswordForm from "./set-password-form";

export default async function SetPasswordPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only reachable right after the invite-link exchange sets a session -
  // no session means the link was invalid/expired, or this was hit directly.
  if (!user) {
    redirect("/login");
  }

  return <SetPasswordForm email={user.email ?? ""} />;
}
