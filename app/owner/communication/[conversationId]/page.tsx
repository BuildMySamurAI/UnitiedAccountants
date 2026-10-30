import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getConversation, getConversationMessages } from "@/lib/ghl/client";
import { ConsoleTopBar } from "@/components/console/ui";
import { CommunicationPanel } from "@/components/console/communication-panel";
import { replyToInboxConversation } from "../actions";
import { MarkReadControls } from "./mark-read-controls";

export default async function InboxConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const supabase = await supabaseServer();

  const conversation = await getConversation(conversationId);
  if (!conversation) notFound();

  const [messages, { data: profile }] = await Promise.all([
    getConversationMessages(conversationId),
    supabase.from("profiles").select("id, first_name, last_name").eq("ghl_contact_id", conversation.contactId).maybeSingle(),
  ]);

  const name = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : conversation.contactName || conversation.fullName || conversation.email || conversation.phone || "Unknown contact";

  return (
    <>
      <ConsoleTopBar
        searchAction="/owner/contacts"
        crumbs={[{ label: "Communication", href: "/owner/communication" }, { label: name }]}
      />
      <div className="wrap">
        <h2 className="page">{name}</h2>
        <p className="sub">
          {profile ? (
            <>
              Client - <Link href={`/owner/contacts/${profile.id}`}>open client page</Link>
            </>
          ) : (
            "Not a client - no portal account."
          )}
          {conversation.email ? ` - ${conversation.email}` : ""}
          {conversation.phone ? ` - ${conversation.phone}` : ""}
        </p>
        <div style={{ marginBottom: 12 }}>
          <MarkReadControls conversationId={conversationId} unreadCount={conversation.unreadCount ?? 0} />
        </div>
        <CommunicationPanel
          contactId={conversation.contactId}
          messages={messages}
          send={replyToInboxConversation.bind(null, conversationId)}
        />
      </div>
    </>
  );
}
