import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.from("staff").select("id").eq("id", user.id).maybeSingle();
  redirect(staffRow ? "/staff" : "/dashboard");
}
