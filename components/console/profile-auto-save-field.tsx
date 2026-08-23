"use client";

import { useState } from "react";
import { updateProfileField, type EditableProfileFieldKey } from "@/lib/profile-actions";
import { Pill } from "./ui";

const STATUS_LABEL = { idle: "Unsaved", saving: "Saving...", saved: "Saved", error: "Error" } as const;
const STATUS_VARIANT = { idle: "n", saving: "n", saved: "g", error: "r" } as const;

export function ProfileAutoSaveField({
  profileId,
  fieldKey,
  label,
  initialValue,
  type = "text",
}: {
  profileId: string;
  fieldKey: EditableProfileFieldKey;
  label: string;
  initialValue: string;
  type?: "text" | "email" | "tel" | "date";
}) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(initialValue ? "saved" : "idle");
  const [error, setError] = useState<string | null>(null);

  async function handleBlur() {
    if (value === savedValue) return;
    setStatus("saving");
    setError(null);
    const result = await updateProfileField(profileId, fieldKey, value);
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
          type={type}
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
        <Pill variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Pill>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
