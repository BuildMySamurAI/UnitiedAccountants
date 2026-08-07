import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { searchConversations, type GhlConversation } from "@/lib/ghl/client";
import { ConsoleTopBar, EmptyState } from "@/components/console/ui";

function channelFor(type?: string): { label: string; cls: string } {
  const t = type ?? "";
  if (t.includes("EMAIL")) return { label: "email", cls: "eml" };
  if (t.includes("SMS") || t.includes("PHONE")) return { label: "sms", cls: "sms" };
  if (t.includes("CALL")) return { label: "call", cls: "call" };
  return { label: "note", cls: "note" };
}

export default async function StaffCommunicationPage() {
  const supabase = await supabaseServer();

  // companies is RLS-scoped to this team member's assignments - everything
  // downstream (which clients, which GHL contacts, which conversations) is
  // derived from that, never from a practice-wide/unscoped GHL lookup.
  const { data: assignedCompanies } = await supabase.from("companies").select("profile_id");
  const profileIds = [...new Set((assignedCompanies ?? []).map((c) => c.profile_id))];

  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, first_name, last_name, ghl_contact_id").in("id", profileIds)
    : { data: [] };

  const contactIds = (profiles ?? []).map((p) => p.ghl_contact_id).filter((id): id is string => Boolean(id));

  const perContact = await Promise.all(
    contactIds.map((contactId) => searchConversations({ contactId }).catch(() => [] as GhlConversation[]))
  );
  const conversations = perContact.flat();
  const sorted = [...conversations].sort((a, b) => (b.lastMessageDate ?? 0) - (a.lastMessageDate ?? 0));

  const profileByContactId = new Map((profiles ?? []).map((p) => [p.ghl_contact_id, p]));

  return (
    <>
      <ConsoleTopBar searchAction="/staff" crumbs={[{ label: "Communication" }]} />
      <div className="wrap">
        <h2 className="page">Communication</h2>
        <p className="sub">Conversations for clients with a company assigned to you.</p>

        <div className="ccard">
          <header>
            <h3>Inbox</h3>
            <span className="hint">{sorted.length} conversations</span>
          </header>
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Last message</th>
                <th>Channel</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const profile = profileByContactId.get(c.contactId);
                const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : c.contactName || c.email || "Unknown contact";
                const ch = channelFor(c.lastMessageType);
                return (
                  <tr key={c.id} className={profile ? "click" : undefined}>
                    <td>
                      <div className="name">
                        {profile ? (
                          <Link href={`/staff/${profile.id}`} style={{ color: "inherit" }}>
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                        {(c.unreadCount ?? 0) > 0 && (
                          <span className="cpill b" style={{ padding: "1px 6px", fontSize: 9.5 }}>
                            new
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      style={{
                        maxWidth: 420,
                        color: (c.unreadCount ?? 0) > 0 ? "var(--ink)" : "var(--ink-3)",
                        fontWeight: (c.unreadCount ?? 0) > 0 ? 600 : 400,
                      }}
                    >
                      {c.lastMessageBody ?? "-"}
                    </td>
                    <td>
                      <span className={`ch ${ch.cls}`}>{ch.label}</span>
                    </td>
                    <td className="mono">{c.lastMessageDate ? new Date(c.lastMessageDate).toLocaleString() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {sorted.length === 0 && <EmptyState title="No conversations yet" subtitle="Nothing yet for your assigned clients." />}
        </div>
      </div>
    </>
  );
}
