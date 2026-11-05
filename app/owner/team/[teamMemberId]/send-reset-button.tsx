"use client";

import { useState } from "react";
import { sendTeamMemberPasswordReset } from "../../actions";

export function SendResetButton({ teamMemberId }: { teamMemberId: string }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleSend() {
    setSending(true);
    setError(null);
    setSentTo(null);
    const result = await sendTeamMemberPasswordReset(teamMemberId);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentTo(result.email);
  }

  return (
    <div>
      <button className="cbtn ghost" onClick={handleSend} disabled={sending}>
        {sending ? "Sending..." : "Send password reset"}
      </button>
      {sentTo && <p style={{ fontSize: 11.5, color: "var(--green, #047857)", marginTop: 6, maxWidth: 260 }}>Reset link sent to {sentTo}</p>}
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6, maxWidth: 260 }}>{error}</p>}
    </div>
  );
}
