import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/console/console-shell";
import { initialsFor } from "@/components/console/ui";
import type { NavGroup } from "@/components/console/sidebar";

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Your account",
    items: [{ href: "/dashboard", label: "My Companies", icon: "companies", exact: true }],
  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const name = profile?.first_name || profile?.last_name ? `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() : user.email ?? "Client";

  return (
    <ConsoleShell subtitle="Client Console" navGroups={NAV_GROUPS} userName={name} userEmail={user.email ?? ""} userInitials={initialsFor(name)}>
      {children}
    </ConsoleShell>
  );
}
