"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsoleLogout } from "./console-logout";

function TodayIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}
function ContactsIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function PipelineIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
function DocsIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}
function FilingsIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function TeamIcon() {
  return (
    <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-1a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const NAV = [
  {
    group: "Practice",
    items: [
      { href: "/owner", label: "Today", icon: TodayIcon, exact: true },
      { href: "/owner/contacts", label: "Contacts", icon: ContactsIcon },
      { href: "/owner/communication", label: "Communication", icon: InboxIcon },
      { href: "/owner/pipeline", label: "Pipeline", icon: PipelineIcon },
    ],
  },
  {
    group: "Compliance",
    items: [
      { href: "/owner/documents", label: "Documents", icon: DocsIcon },
      { href: "/owner/filings", label: "Filing calendar", icon: FilingsIcon },
    ],
  },
  {
    group: "Admin",
    items: [{ href: "/owner/team", label: "Team", icon: TeamIcon }],
  },
];

export function Sidebar({
  ownerName,
  ownerEmail,
  ownerInitials,
}: {
  ownerName: string;
  ownerEmail: string;
  ownerInitials: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="side">
      <div className="brand">
        <div className="mark">UA</div>
        <div>
          <h1>United Accountants</h1>
          <span>Practice Console</span>
        </div>
      </div>

      {NAV.map((group) => (
        <div className="navgrp" key={group.group}>
          <h6>{group.group}</h6>
          {group.items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`nav ${active ? "on" : ""}`}>
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="who">
        <div className="av">{ownerInitials}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <b>{ownerName}</b>
          <i style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ownerEmail}>
            {ownerEmail}
          </i>
        </div>
        <ConsoleLogout />
      </div>
    </aside>
  );
}
