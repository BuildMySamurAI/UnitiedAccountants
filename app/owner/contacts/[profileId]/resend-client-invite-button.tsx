"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resendClientInvite } from "../../actions";

export function ResendClientInviteButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    setError(null);
    const result = await resendClientInvite(profileId);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
    router.refresh();
  }

  return (
    <div>
      <button className="cbtn ghost" onClick={handleResend} disabled={sending || sent}>
        {sending ? "Resending..." : sent ? "Invite resent" : "Resend invite"}
      </button>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6, maxWidth: 240 }}>{error}</p>}
    </div>
  );
}
