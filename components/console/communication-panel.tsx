"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendContactMessage } from "@/lib/ghl/conversation-actions";
import { EmptyState } from "@/components/console/ui";
import type { GhlMessage } from "@/lib/ghl/client";

function channelFor(messageType: string): { label: string; cls: string } {
  if (messageType.includes("EMAIL")) return { label: "email", cls: "eml" };
  if (messageType.includes("SMS") || messageType.includes("PHONE")) return { label: "sms", cls: "sms" };
  if (messageType.includes("CALL")) return { label: "call", cls: "call" };
  return { label: "note", cls: "note" };
}

// GHL logs its own system events (opportunity created, pipeline stage
// changed, etc.) into the same per-contact feed real messages come from -
// nothing was ever sent to the contact for one of these, it's just GHL's
// activity trail. They used to render inline with real messages under a
// generic "Note" label, which reads as if a message went out - split out
// into their own side rail instead, so the main thread is only ever real
// SMS/Email/Call.
function isSystemActivity(messageType: string): boolean {
  return messageType.startsWith("TYPE_ACTIVITY");
}

export function CommunicationPanel({ contactId, messages }: { contactId: string; messages: GhlMessage[] }) {
  const router = useRouter();
  const [channel, setChannel] = useState<"SMS" | "Email">("SMS");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    const result = await sendContactMessage(contactId, channel, text, channel === "Email" ? subject : undefined);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setText("");
    setSubject("");
    router.refresh();
  }

  const sorted = [...messages].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
  const conversation = sorted.filter((m) => !isSystemActivity(m.messageType));
  const activity = sorted.filter((m) => isSystemActivity(m.messageType)).reverse(); // most recent first

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div className="ccard" style={{ flex: "2 1 420px", minWidth: 0 }}>
        <header>
          <h3>Conversation</h3>
          <span className="hint">{conversation.length} messages</span>
        </header>
        {conversation.length === 0 ? (
          <EmptyState title="No messages yet" subtitle="Nothing here yet for this contact." />
        ) : (
          <div className="thread">
            {conversation.map((m) => {
              const ch = channelFor(m.messageType);
              return (
                <div key={m.id} className={`msg ${m.direction === "inbound" ? "in" : "out"}`}>
                  <div>
                    <div className="b">{m.body}</div>
                    <div className="t">
                      <span className={`ch ${ch.cls}`}>{ch.label}</span>
                      {new Date(m.dateAdded).toLocaleString("en-US")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="compose">
          <div className="seg">
            <button className={channel === "SMS" ? "on" : ""} onClick={() => setChannel("SMS")}>
              SMS
            </button>
            <button className={channel === "Email" ? "on" : ""} onClick={() => setChannel("Email")}>
              Email
            </button>
          </div>
          {channel === "Email" && (
            <input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              style={{ marginBottom: 6 }}
            />
          )}
          <input
            placeholder="Write a reply..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            disabled={sending}
          />
          <button className="cbtn" onClick={handleSend} disabled={sending}>
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
        {error && <p style={{ padding: "0 15px 12px", fontSize: 12, color: "var(--red)" }}>{error}</p>}
      </div>

      <div className="ccard" style={{ flex: "1 1 220px", maxWidth: 280 }}>
        <header>
          <h3 style={{ fontSize: 12.5 }}>Activity</h3>
          <span className="hint">{activity.length}</span>
        </header>
        {activity.length === 0 ? (
          <p style={{ padding: "12px 15px", fontSize: 11.5, color: "var(--ink-3)" }}>No activity logged yet.</p>
        ) : (
          <div style={{ padding: "6px 15px 12px" }}>
            {activity.map((m) => (
              <div key={m.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--rule-soft)", fontSize: 11.5 }}>
                <div style={{ color: "var(--ink-2)" }}>{m.body}</div>
                <div style={{ color: "var(--ink-3)", marginTop: 2 }}>{new Date(m.dateAdded).toLocaleString("en-US")}</div>
              </div>
            ))}
          </div>
        )}
        <p style={{ padding: "0 15px 12px", fontSize: 10.5, color: "var(--ink-3)" }}>
          System-generated - never sent to the client, just a log of what happened.
        </p>
      </div>
    </div>
  );
}
