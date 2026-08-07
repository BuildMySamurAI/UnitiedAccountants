"use client";

import { useState } from "react";
import { deleteContact } from "../../actions";

export function DeleteContactButton({
  profileId,
  clientName,
  companyNames,
}: {
  profileId: string;
  clientName: string;
  companyNames: string[];
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const companyList = companyNames.length ? ` and their ${companyNames.length} company(ies) (${companyNames.join(", ")})` : "";
    const confirmed = window.confirm(
      `Delete ${clientName}${companyList}?\n\nThis permanently deletes them from the CRM as well as the portal, and revokes their portal login. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    const result = await deleteContact(profileId);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // A full navigation, not router.push - guarantees the destination list
    // is fetched fresh rather than possibly served from the client router
    // cache with the just-deleted contact still in it.
    window.location.href = "/owner/contacts";
  }

  return (
    <div>
      <button className="cbtn ghost" onClick={handleDelete} disabled={deleting} style={{ color: "var(--red)", borderColor: "var(--red)" }}>
        {deleting ? "Deleting..." : "Delete contact"}
      </button>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6, maxWidth: 240 }}>{error}</p>}
    </div>
  );
}
