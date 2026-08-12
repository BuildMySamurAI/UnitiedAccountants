"use client";

import { useState } from "react";

export function ContactTabs({
  companiesCount,
  messagesCount,
  tasksCount,
  companiesPanel,
  communicationPanel,
  tasksPanel,
}: {
  companiesCount: number;
  messagesCount: number;
  tasksCount?: number;
  companiesPanel: React.ReactNode;
  communicationPanel: React.ReactNode;
  tasksPanel?: React.ReactNode;
}) {
  const [tab, setTab] = useState<"companies" | "comm" | "tasks">("companies");

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
      </div>
      <div style={{ display: tab === "companies" ? "block" : "none" }}>{companiesPanel}</div>
      <div style={{ display: tab === "comm" ? "block" : "none" }}>{communicationPanel}</div>
      {tasksPanel && <div style={{ display: tab === "tasks" ? "block" : "none" }}>{tasksPanel}</div>}
    </>
  );
}
