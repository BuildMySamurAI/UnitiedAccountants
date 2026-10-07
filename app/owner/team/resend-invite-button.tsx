"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resendTeamMemberInvite } from "../actions";

export function ResendInviteButton({ teamMemberId }: { teamMemberId: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    setError(null);
    const result = await resendTeamMemberInvite(teamMemberId);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
    router.refresh();
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button className="cbtn ghost" onClick={handleResend} disabled={sending || sent} style={{ fontSize: 11.5, padding: "5px 10px" }}>
        {sending ? "Resending..." : sent ? "Invite resent" : "Resend invite"}
      </button>
      {error && <p style={{ fontSize: 11, color: "var(--red)", marginTop: 4, maxWidth: 200 }}>{error}</p>}
    </div>
  );
}
