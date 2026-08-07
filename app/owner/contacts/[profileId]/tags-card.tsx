"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addContactTag } from "../../actions";

export function TagsCard({ contactId, tags }: { contactId: string; tags: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await addContactTag(contactId, value);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setValue("");
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
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Add a tag..."
            disabled={submitting}
            style={{
              flex: 1,
              padding: "8px 11px",
              border: "1px solid var(--rule)",
              borderRadius: 7,
              font: "inherit",
              fontSize: 13,
              background: "#fff",
              color: "var(--ink)",
            }}
          />
          <button className="cbtn" onClick={handleAdd} disabled={submitting}>
            {submitting ? "Adding..." : "Add"}
          </button>
        </div>
        {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
      </div>
    </div>
  );
}
