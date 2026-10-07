"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkOrphanedTeamMember } from "../actions";

export function LinkOrphanedMemberButton({ userId, fullName }: { userId: string; fullName: string }) {
  const router = useRouter();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLink() {
    const confirmed = window.confirm(`Add ${fullName} to the team list? This only creates the missing record - it doesn't send any new email.`);
    if (!confirmed) return;

    setLinking(true);
    setError(null);
    const result = await linkOrphanedTeamMember(userId);
    setLinking(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button className="cbtn" onClick={handleLink} disabled={linking} style={{ fontSize: 11.5, padding: "5px 10px" }}>
        {linking ? "Linking..." : "Add to team"}
      </button>
      {error && <p style={{ fontSize: 11, color: "var(--red)", marginTop: 4, maxWidth: 200 }}>{error}</p>}
    </div>
  );
}
