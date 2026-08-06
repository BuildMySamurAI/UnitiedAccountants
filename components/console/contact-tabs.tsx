"use client";

import { useState } from "react";

export function ContactTabs({
  companiesCount,
  messagesCount,
  companiesPanel,
  communicationPanel,
}: {
  companiesCount: number;
  messagesCount: number;
  companiesPanel: React.ReactNode;
  communicationPanel: React.ReactNode;
}) {
  const [tab, setTab] = useState<"companies" | "comm">("companies");

  return (
    <>
      <div className="ctabs">
        <button className={`ctab ${tab === "companies" ? "on" : ""}`} onClick={() => setTab("companies")}>
          Companies <span className="n">{companiesCount}</span>
        </button>
        <button className={`ctab ${tab === "comm" ? "on" : ""}`} onClick={() => setTab("comm")}>
          Communication <span className="n">{messagesCount}</span>
        </button>
      </div>
      <div style={{ display: tab === "companies" ? "block" : "none" }}>{companiesPanel}</div>
      <div style={{ display: tab === "comm" ? "block" : "none" }}>{communicationPanel}</div>
    </>
  );
}
