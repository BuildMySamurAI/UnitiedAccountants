import { supabaseServer } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/console/console-shell";
import { initialsFor } from "@/components/console/ui";
import type { NavGroup } from "@/components/console/sidebar";

const NAV_GROUPS: NavGroup[] = [
  {
    group: "Practice",
    items: [
      { href: "/owner", label: "Today", icon: "today", exact: true },
      { href: "/owner/contacts", label: "Contacts", icon: "contacts" },
      { href: "/owner/communication", label: "Communication", icon: "inbox" },
      { href: "/owner/pipeline", label: "Pipeline", icon: "pipeline" },
    ],
  },
  {
    group: "Compliance",
    items: [
      { href: "/owner/documents", label: "Documents", icon: "docs" },
      { href: "/owner/filings", label: "Filing calendar", icon: "filings" },
      { href: "/owner/bulk-services", label: "Bulk deadlines", icon: "companies" },
    ],
  },
  {
    group: "Admin",
    items: [{ href: "/owner/team", label: "Team", icon: "team" }],
  },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: owner } = user
    ? await supabase.from("owners").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const ownerName = owner?.full_name ?? user?.email ?? "Owner";

  return (
    <ConsoleShell subtitle="Practice Console" navGroups={NAV_GROUPS} userName={ownerName} userEmail={user?.email ?? ""} userInitials={initialsFor(ownerName)}>
      {children}
    </ConsoleShell>
  );
}
