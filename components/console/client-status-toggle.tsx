"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setClientStatus } from "@/lib/client-status-actions";
import { Pill } from "./ui";

export function ClientStatusToggle({ profileId, initialStatus }: { profileId: string; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus || "Active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: "Active" | "Inactive") {
    if (next === "Inactive" && !window.confirm("Mark this client as Inactive? They'll stop showing as an active client and stop generating new recurring work (payroll rollover, monthly bookkeeping resets, tax deadline resets). Nothing is deleted - just paused.")) {
      return;
    }
    setSaving(true);
    setError(null);
    const result = await setClientStatus(profileId, next);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(next);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Pill variant={status === "Active" ? "g" : "n"}>{status}</Pill>
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as "Active" | "Inactive")}
        disabled={saving}
        style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
      >
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
      </select>
      {error && <span style={{ fontSize: 11.5, color: "var(--red)" }}>{error}</span>}
    </div>
  );
}
