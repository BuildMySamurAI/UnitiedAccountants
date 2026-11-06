"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addContactTag } from "../../actions";

export function TagsCard({
  contactId,
  tags,
  availableTags,
}: {
  contactId: string;
  tags: string[];
  availableTags: string[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only offer tags the contact doesn't already have (case-insensitive).
  const have = new Set(tags.map((t) => t.toLowerCase()));
  const pickable = availableTags.filter((t) => !have.has(t.toLowerCase()));

  async function handleAdd(tag: string) {
    setSubmitting(true);
    setError(null);
    const result = await addContactTag(contactId, tag);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Tags</h3>
        <span className="hint">{tags.length}</span>
      </header>
      <div style={{ padding: "14px 15px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: tags.length ? 12 : 0 }}>
          {tags.map((t) => (
            <span key={t} className="ctag">
              {t}
            </span>
          ))}
          {tags.length === 0 && <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No tags yet.</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Add a tag</div>
        {pickable.length === 0 ? (
          <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No more tags available.</span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pickable.map((t) => (
              <button
                type="button"
                key={t}
                className="ctag"
                disabled={submitting}
                onClick={() => handleAdd(t)}
                style={{ cursor: "pointer" }}
              >
                + {t}
              </button>
            ))}
          </div>
        )}
        {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
      </div>
    </div>
  );
}
