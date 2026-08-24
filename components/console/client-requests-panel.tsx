"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveTaskRequest, rejectTaskRequest } from "@/lib/tasks-actions";
import { EmptyState, Pill } from "./ui";

export type ClientRequest = {
  id: string;
  title: string;
  description: string | null;
  deadlineDate: string | null;
  createdAt: string;
  clientName: string;
  href: string;
};

function RequestRow({ request, teamMembers }: { request: ClientRequest; teamMembers: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(request.title);
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState(request.deadlineDate ?? "");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    if (!assignedTo) {
      setError("Pick who this should go to.");
      return;
    }
    setBusy("approve");
    setError(null);
    const result = await approveTaskRequest(request.id, { assignedTo, title, deadlineDate: deadline || undefined });
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleReject() {
    setBusy("reject");
    setError(null);
    const result = await rejectTaskRequest(request.id);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ borderBottom: "1px solid var(--rule-soft)", padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div className="y" style={{ marginBottom: 2 }}>
            <Link href={request.href} style={{ color: "inherit" }}>
              {request.clientName}
            </Link>{" "}
            - {new Date(request.createdAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
          </div>
          {request.description && <div style={{ fontSize: 13 }}>{request.description}</div>}
        </div>
        <Pill variant="b">Pending review</Pill>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: "1 1 200px", fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        >
          <option value="">Assign to...</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--rule)" }}
        />
        <button className="cbtn" onClick={handleApprove} disabled={busy !== null}>
          {busy === "approve" ? "Approving..." : "Approve"}
        </button>
        <button className="cbtn ghost" onClick={handleReject} disabled={busy !== null}>
          {busy === "reject" ? "Declining..." : "Decline"}
        </button>
      </div>
      {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}

export function ClientRequestsPanel({ requests, teamMembers }: { requests: ClientRequest[]; teamMembers: { id: string; full_name: string }[] }) {
  return (
    <div className="ccard" style={{ marginBottom: 16 }}>
      <header>
        <h3>Client requests</h3>
        <span className="hint">{requests.length} awaiting review</span>
      </header>
      <div style={{ padding: "12px 15px" }}>
        {requests.length === 0 && <EmptyState title="Nothing pending" subtitle="Client requests will show up here for approval." />}
        {requests.map((r) => (
          <RequestRow key={r.id} request={r} teamMembers={teamMembers} />
        ))}
      </div>
    </div>
  );
}
