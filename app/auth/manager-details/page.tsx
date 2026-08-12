import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import ManagerDetailsForm from "./manager-details-form";

export default async function ManagerDetailsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: manager } = await supabase.from("managers").select("email, invited_name").eq("id", user.id).maybeSingle();

  // Only pending managers land here - anyone else (or a manager who already
  // finished this step) goes straight to password setup.
  if (!manager) {
    redirect("/auth/set-password");
  }

  return <ManagerDetailsForm email={manager.email} invitedName={manager.invited_name ?? ""} />;
}
