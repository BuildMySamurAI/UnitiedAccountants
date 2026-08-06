"use client";

import { useState } from "react";
import { updateCompanyField, type EditableFieldKey } from "./actions";

const STATUS_LABEL = { idle: "Unsaved", saving: "Saving...", saved: "Saved", error: "Error" } as const;
const STATUS_VARIANT = { idle: "n", saving: "n", saved: "g", error: "r" } as const;

export function AutoSaveField({
  companyId,
  fieldKey,
  label,
  initialValue,
}: {
  companyId: string;
  fieldKey: EditableFieldKey;
  label: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initialValue ? "saved" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleBlur() {
    if (value === savedValue) return;
    setStatus("saving");
    setError(null);
    const result = await updateCompanyField(companyId, fieldKey, value);
    if (result.ok) {
      setSavedValue(value);
      setStatus("saved");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  return (
    <div style={{ padding: "12px 15px", borderBottom: "1px solid var(--rule-soft)" }}>
      <label className="fact" style={{ display: "block", padding: 0, border: "none" }}>
        <span className="k">{label}</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status !== "saving") setStatus("idle");
          }}
          onBlur={handleBlur}
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
        <span className={`cpill ${STATUS_VARIANT[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
