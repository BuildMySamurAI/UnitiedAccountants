"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markInboxConversationRead } from "../actions";

// Opening a thread marks it read in GHL automatically (once); the button is
// the explicit way to do it again, or to retry if the automatic call failed.
export function MarkReadControls({ conversationId, unreadCount }: { conversationId: string; unreadCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoFired = useRef(false);

  async function markRead() {
    setBusy(true);
    setError(null);
    const result = await markInboxConversationRead(conversationId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  useEffect(() => {
    if (unreadCount > 0 && !autoFired.current) {
      autoFired.current = true;
      markRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {unreadCount > 0 ? (
        <button className="cbtn" onClick={markRead} disabled={busy}>
          {busy ? "Marking..." : `Mark as read (${unreadCount})`}
        </button>
      ) : (
        <span className="hint">Read</span>
      )}
      {error && <span style={{ fontSize: 12, color: "var(--red)" }}>{error}</span>}
    </div>
  );
}
