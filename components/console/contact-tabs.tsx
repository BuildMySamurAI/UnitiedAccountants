"use client";

import { useState } from "react";

export function ContactTabs({
  companiesCount,
  messagesCount,
  tasksCount,
  notesCount,
  companiesPanel,
  communicationPanel,
  tasksPanel,
  infoPanel,
  notesPanel,
}: {
  companiesCount: number;
  messagesCount: number;
  tasksCount?: number;
  notesCount?: number;
  companiesPanel: React.ReactNode;
  communicationPanel: React.ReactNode;
  tasksPanel?: React.ReactNode;
  infoPanel?: React.ReactNode;
  notesPanel?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"companies" | "comm" | "tasks" | "info" | "notes">("companies");

  return (
    <>
      <div className="ctabs">
        <button className={`ctab ${tab === "companies" ? "on" : ""}`} onClick={() => setTab("companies")}>
          Companies <span className="n">{companiesCount}</span>
        </button>
        <button className={`ctab ${tab === "comm" ? "on" : ""}`} onClick={() => setTab("comm")}>
          Communication <span className="n">{messagesCount}</span>
        </button>
        {tasksPanel && (
          <button className={`ctab ${tab === "tasks" ? "on" : ""}`} onClick={() => setTab("tasks")}>
            Tasks <span className="n">{tasksCount ?? 0}</span>
          </button>
        )}
        {notesPanel && (
          <button className={`ctab ${tab === "notes" ? "on" : ""}`} onClick={() => setTab("notes")}>
            Notes <span className="n">{notesCount ?? 0}</span>
          </button>
        )}
        {infoPanel && (
          <button className={`ctab ${tab === "info" ? "on" : ""}`} onClick={() => setTab("info")}>
            Info
          </button>
        )}
      </div>
      <div style={{ display: tab === "companies" ? "block" : "none" }}>{companiesPanel}</div>
      <div style={{ display: tab === "comm" ? "block" : "none" }}>{communicationPanel}</div>
      {tasksPanel && <div style={{ display: tab === "tasks" ? "block" : "none" }}>{tasksPanel}</div>}
      {notesPanel && <div style={{ display: tab === "notes" ? "block" : "none" }}>{notesPanel}</div>}
      {infoPanel && <div style={{ display: tab === "info" ? "block" : "none" }}>{infoPanel}</div>}
    </>
  );
}
