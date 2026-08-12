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

  return (
    <div className="ccard">
      <header>
        <h3>Conversation</h3>
        <span className="hint">{messages.length} messages</span>
      </header>
      {sorted.length === 0 ? (
        <EmptyState title="No messages yet" subtitle="Nothing here yet for this contact." />
      ) : (
        <div className="thread">
          {sorted.map((m) => {
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
  );
}
