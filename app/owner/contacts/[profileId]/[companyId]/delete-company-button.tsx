"use client";

import { useState } from "react";
import { deleteCompany } from "../../../actions";

export function DeleteCompanyButton({
  companyId,
  companyName,
  profileId,
}: {
  companyId: string;
  companyName: string;
  profileId: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${companyName}?\n\nThis permanently deletes it from the CRM as well as the portal, including its documents. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    const result = await deleteCompany(companyId);
    setDeleting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = `/owner/contacts/${profileId}`;
  }

  return (
    <div className="ccard">
      <header>
        <h3>Danger zone</h3>
      </header>
      <div style={{ padding: "14px 15px" }}>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 10 }}>
          Permanently deletes this company from the CRM and the portal, including its documents.
        </p>
        <button className="cbtn ghost" onClick={handleDelete} disabled={deleting} style={{ color: "var(--red)", borderColor: "var(--red)" }}>
          {deleting ? "Deleting..." : "Delete company"}
        </button>
        {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}
