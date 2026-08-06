"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsoleLogout } from "./console-logout";
import {
  TodayIcon,
  ContactsIcon,
  InboxIcon,
  PipelineIcon,
  DocsIcon,
  FilingsIcon,
  TeamIcon,
  CompaniesIcon,
} from "./icons";

// Icons are looked up by name here (client-side) rather than passed in as
// component references - a Server Component layout can't hand a function
// prop across the RSC boundary to this Client Component.
const ICONS = {
  today: TodayIcon,
  contacts: ContactsIcon,
  inbox: InboxIcon,
  pipeline: PipelineIcon,
  docs: DocsIcon,
  filings: FilingsIcon,
  team: TeamIcon,
  companies: CompaniesIcon,
} as const;
export type IconName = keyof typeof ICONS;

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };
export type NavGroup = { group: string; items: NavItem[] };

export function Sidebar({
  subtitle,
  navGroups,
  userName,
  userEmail,
  userInitials,
}: {
  subtitle: string;
  navGroups: NavGroup[];
  userName: string;
  userEmail: string;
  userInitials: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="side">
      <div className="brand">
        <div className="mark">UA</div>
        <div>
          <h1>United Accountants</h1>
          <span>{subtitle}</span>
        </div>
      </div>

      {navGroups.map((group) => (
        <div className="navgrp" key={group.group}>
          <h6>{group.group}</h6>
          {group.items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = ICONS[item.icon];
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
        <div className="av">{userInitials}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <b>{userName}</b>
          <i style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={userEmail}>
            {userEmail}
          </i>
        </div>
        <ConsoleLogout />
      </div>
    </aside>
  );
}
