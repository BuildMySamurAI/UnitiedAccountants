"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignTeamMember } from "../../actions";

export function UnassignButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnassign() {
    const confirmed = window.confirm(`Unassign ${companyName} from this team member?`);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    const result = await assignTeamMember(companyId, null);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button className="cbtn ghost" onClick={handleUnassign} disabled={submitting}>
        {submitting ? "Unassigning..." : "Unassign"}
      </button>
      {error && <p style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>{error}</p>}
    </div>
  );
}
