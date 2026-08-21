"use client";

import { useMemo, useState } from "react";
import { sendBulkMessage } from "@/lib/bulk-messages-actions";
import type { BulkMessageRecipient } from "@/lib/bulk-messages";
import { MESSAGE_SERVICE_FILTERS } from "@/lib/message-service-filters";
import { EmptyState } from "./ui";

export function BulkMessageForm({ recipients }: { recipients: BulkMessageRecipient[] }) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [type, setType] = useState<"SMS" | "Email">("SMS");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serviceLabelByKey = useMemo(() => new Map(MESSAGE_SERVICE_FILTERS.map((s) => [s.key, s.label])), []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const r of recipients) for (const t of r.tags) s.add(t);
    return [...s].sort();
  }, [recipients]);

  // Tags and services each match "any selected" on their own, but combine
  // with each other as AND - picking a service narrows further within
  // whatever the tag filter already selected, so "Payroll" + "VIP" means
  // payroll clients who are also tagged VIP, not either group.
  const filtered = useMemo(() => {
    return recipients.filter((r) => {
      const tagMatch = selectedTags.size === 0 || r.tags.some((t) => selectedTags.has(t));
      const serviceMatch = selectedServices.size === 0 || r.serviceTypes.some((s) => selectedServices.has(s));
      return tagMatch && serviceMatch;
    });
  }, [recipients, selectedTags, selectedServices]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function toggleService(service: string) {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });
  }

  function toggleRecipient(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(new Set(filtered.filter((r) => !r.dnd && r.contactId).map((r) => r.profileId)));
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    setResult(null);
    const res = await sendBulkMessage({ profileIds: [...selectedIds], type, message, subject: type === "Email" ? subject : undefined });
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const parts = [`Sent to ${res.sent}`];
    if (res.skippedDnd > 0) parts.push(`${res.skippedDnd} skipped (opted out)`);
    if (res.failed > 0) parts.push(`${res.failed} failed`);
    setResult(parts.join(" - "));
    setSelectedIds(new Set());
    setMessage("");
    setSubject("");
  }

  return (
    <div className="detail">
      <div>
        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Filter by tag</h3>
            <span className="hint">{allTags.length} tags in use</span>
          </header>
          <div style={{ padding: "12px 15px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {allTags.length === 0 && <EmptyState title="No tags found on any contact yet" />}
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className="cbtn ghost"
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  background: selectedTags.has(t) ? "var(--green-soft, #e4efe9)" : undefined,
                  borderColor: selectedTags.has(t) ? "var(--green)" : undefined,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="ccard" style={{ marginBottom: 16 }}>
          <header>
            <h3>Filter by service</h3>
          </header>
          <div style={{ padding: "12px 15px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MESSAGE_SERVICE_FILTERS.map((s) => (
              <button
                key={s.key}
                onClick={() => toggleService(s.key)}
                className="cbtn ghost"
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  background: selectedServices.has(s.key) ? "var(--green-soft, #e4efe9)" : undefined,
                  borderColor: selectedServices.has(s.key) ? "var(--green)" : undefined,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ccard">
          <header>
            <h3>Recipients</h3>
            <span className="hint">
              {selectedIds.size} selected of {filtered.length} shown
            </span>
          </header>
          <div style={{ padding: "8px 15px", borderBottom: "1px solid var(--rule-soft)" }}>
            <button onClick={selectAllFiltered} className="cbtn ghost" style={{ fontSize: 11, padding: "5px 10px" }}>
              Select all shown (excludes opted-out)
            </button>
          </div>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {filtered.length === 0 && <EmptyState title="No clients match this filter" />}
            {filtered.map((r) => {
              const disabled = r.dnd || !r.contactId;
              return (
                <label key={r.profileId} className="rl" style={{ cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.45 : 1 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.profileId)}
                    disabled={disabled}
                    onChange={() => toggleRecipient(r.profileId)}
                    style={{ marginRight: 10 }}
                  />
                  <div>
                    <div className="x">
                      <b>{r.name}</b> {r.companyNames.length > 0 && `- ${r.companyNames.join(", ")}`}
                    </div>
                    <div className="y">
                      {r.tags.length > 0 ? r.tags.join(", ") : "no tags"}
                      {r.serviceTypes.length > 0 && ` - ${r.serviceTypes.map((s) => serviceLabelByKey.get(s) ?? s).join(", ")}`}
                      {r.dnd && " - opted out"}
                      {!r.contactId && " - no CRM contact"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rail">
        <div className="ccard">
          <header>
            <h3>Compose</h3>
          </header>
          <div style={{ padding: "14px 15px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                onClick={() => setType("SMS")}
                className="cbtn ghost"
                style={{ flex: 1, background: type === "SMS" ? "var(--green-soft, #e4efe9)" : undefined }}
              >
                Text message
              </button>
              <button
                onClick={() => setType("Email")}
                className="cbtn ghost"
                style={{ flex: 1, background: type === "Email" ? "var(--green-soft, #e4efe9)" : undefined }}
              >
                Email
              </button>
            </div>
            {type === "Email" && (
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ width: "100%", fontSize: 13, padding: 10, borderRadius: 8, border: "1px solid var(--rule)", marginBottom: 8, boxSizing: "border-box" }}
              />
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === "SMS" ? "Type your text message..." : "Type your email..."}
              rows={8}
              style={{ width: "100%", fontSize: 13, padding: 10, borderRadius: 8, border: "1px solid var(--rule)", resize: "vertical" }}
            />
            <button
              onClick={handleSend}
              disabled={sending || selectedIds.size === 0 || !message.trim() || (type === "Email" && !subject.trim())}
              className="cbtn"
              style={{ marginTop: 10, width: "100%" }}
            >
              {sending ? "Sending..." : `Send to ${selectedIds.size} client${selectedIds.size === 1 ? "" : "s"}`}
            </button>
            {result && <p style={{ fontSize: 12, color: "var(--green)", marginTop: 8 }}>{result}</p>}
            {error && <p style={{ fontSize: 11.5, color: "var(--red)", marginTop: 8 }}>{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
