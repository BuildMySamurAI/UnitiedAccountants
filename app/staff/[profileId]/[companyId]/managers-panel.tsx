"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inviteManager, revokeManagerAccess } from "./managers-actions";
import { EmptyState, Pill } from "@/components/console/ui";

export type ManagerRecord = {
  managerId: string;
  email: string;
  name: string;
  status: "invited" | "details_submitted" | "active";
};

export function ManagersPanel({ companyId, managers }: { companyId: string; managers: ManagerRecord[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleInvite() {
    setInviting(true);
    setError(null);
    const result = await inviteManager(companyId, email, name);
    setInviting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEmail("");
    setName("");
    router.refresh();
  }

  async function handleRevoke(managerId: string) {
    if (!window.confirm("Remove this manager's access to this company? They'll keep access to any other companies they've been granted.")) return;
    setRevokingId(managerId);
    await revokeManagerAccess(managerId, companyId);
    setRevokingId(null);
    router.refresh();
  }

  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Managers</h3>
        <span className="hint">Client Portal access scoped to this company only</span>
      </header>

      <div style={{ padding: "4px 15px" }}>
        {managers.length === 0 && <EmptyState title="No managers added to this company yet" />}
        {managers.map((m) => (
          <div key={m.managerId} className="rl">
            <div>
              <div className="x">
                <b>{m.name || m.email}</b>
              </div>
              <div className="y">{m.email}</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {m.status === "active" ? (
                <Pill variant="g">Active</Pill>
              ) : (
                <Pill variant="a">Invite pending</Pill>
              )}
              <button
                onClick={() => handleRevoke(m.managerId)}
                disabled={revokingId === m.managerId}
                className="cbtn ghost"
                style={{ fontSize: 11, padding: "5px 10px" }}
              >
                {revokingId === m.managerId ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 15px", borderTop: "1px solid var(--rule-soft)", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: "1 1 160px", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: "1 1 200px", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />
        <button onClick={handleInvite} disabled={inviting} className="cbtn">
          {inviting ? "Inviting..." : "+ Invite manager"}
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", padding: "0 15px 10px" }}>{error}</p>}
    </div>
  );
}
