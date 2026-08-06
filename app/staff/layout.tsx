import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/console/console-shell";
import { initialsFor } from "@/components/console/ui";
import type { NavGroup } from "@/components/console/sidebar";

const NAV_GROUPS: NavGroup[] = [
  {
    group: "My Work",
    items: [
      { href: "/staff", label: "My Clients", icon: "contacts", exact: true },
      { href: "/staff/communication", label: "Communication", icon: "inbox" },
    ],
  },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: teamMember } = user
    ? await supabase.from("team_members").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const name = teamMember?.full_name ?? user?.email ?? "Team member";

  return (
    <ConsoleShell subtitle="Team Console" navGroups={NAV_GROUPS} userName={name} userEmail={user?.email ?? ""} userInitials={initialsFor(name)}>
      {children}
    </ConsoleShell>
  );
}
