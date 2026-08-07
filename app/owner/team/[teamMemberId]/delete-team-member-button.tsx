"use client";

import { useState } from "react";
import { deleteTeamMember } from "../../actions";

export function DeleteTeamMemberButton({ teamMemberId, name, companyCount }: { teamMemberId: string; name: string; companyCount: number }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const assigned = companyCount > 0 ? ` They'll be unassigned from ${companyCount} compan${companyCount === 1 ? "y" : "ies"} first.` : "";
    const confirmed = window.confirm(`Remove ${name} from the team?\n\nThis revokes their portal login immediately.${assigned} This cannot be undone.`);
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    const result = await deleteTeamMember(teamMemberId);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = "/owner/team";
  }

  return (
    <div>
      <button className="cbtn ghost" onClick={handleDelete} disabled={deleting} style={{ color: "var(--red)", borderColor: "var(--red)" }}>
        {deleting ? "Removing..." : "Remove team member"}
      </button>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6, maxWidth: 260 }}>{error}</p>}
    </div>
  );
}
