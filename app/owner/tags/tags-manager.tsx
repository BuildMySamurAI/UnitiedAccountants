"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTag, renameTag, removeTag, type TagActionResult } from "./actions";

const inputStyle = {
  flex: 1,
  padding: "8px 11px",
  border: "1px solid var(--rule)",
  borderRadius: 7,
  font: "inherit",
  fontSize: 13,
  background: "#fff",
  color: "var(--ink)",
} as const;

export function TagsManager({ tags }: { tags: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function run(action: () => Promise<TagActionResult>, onDone?: () => void) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone?.();
    router.refresh();
  }

  return (
    <div className="ccard">
      <header>
        <h3>Approved tags</h3>
        <span className="hint">{tags.length}</span>
      </header>
      <div style={{ padding: "14px 15px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) run(() => addTag(newName), () => setNewName(""));
            }}
            placeholder="New tag name..."
            disabled={busy}
            style={inputStyle}
          />
          <button
            className="cbtn"
            disabled={busy || !newName.trim()}
            onClick={() => run(() => addTag(newName), () => setNewName(""))}
          >
            Add tag
          </button>
        </div>

        {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginBottom: 10 }}>{error}</p>}

        {tags.length === 0 && <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No tags yet.</span>}
        {tags.map((t) => (
          <div
            key={t.id}
            style={{ padding: "9px 0", borderTop: "1px solid var(--rule-soft)", display: "flex", flexDirection: "column", gap: 8 }}
          >
            {renamingId === t.id ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameValue.trim()) run(() => renameTag(t.id, renameValue), () => setRenamingId(null));
                  }}
                  disabled={busy}
                  style={inputStyle}
                />
                <button
                  className="cbtn"
                  disabled={busy || !renameValue.trim()}
                  onClick={() => run(() => renameTag(t.id, renameValue), () => setRenamingId(null))}
                >
                  Save
                </button>
                <button className="cbtn ghost" disabled={busy} onClick={() => setRenamingId(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="ctag">{t.name}</span>
                <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    className="cbtn ghost"
                    disabled={busy}
                    onClick={() => {
                      setRenamingId(t.id);
                      setRenameValue(t.name);
                      setConfirmingId(null);
                      setError(null);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    className="cbtn ghost"
                    disabled={busy}
                    onClick={() => {
                      setConfirmingId(t.id);
                      setRenamingId(null);
                      setError(null);
                    }}
                  >
                    Remove
                  </button>
                </span>
              </div>
            )}
            {confirmingId === t.id && (
              <div style={{ fontSize: 12.5, color: "var(--red)" }}>
                <p style={{ marginBottom: 8 }}>{"Contacts that have this tag may lose it. This can't be undone."}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="cbtn" disabled={busy} onClick={() => run(() => removeTag(t.id), () => setConfirmingId(null))}>
                    {busy ? "Removing..." : "Yes, remove"}
                  </button>
                  <button className="cbtn ghost" disabled={busy} onClick={() => setConfirmingId(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
