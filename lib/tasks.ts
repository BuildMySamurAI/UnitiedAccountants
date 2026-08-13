// Per-company or per-client task tracking. EBT Application and the closing
// process are fixed task types the portal creates itself; 'custom' covers
// ad-hoc requests from either staff or the client.
export const TASK_TYPES = [{ key: "ebt_application", label: "EBT Application" }] as const;

export type TaskTypeKey = "ebt_application" | "custom" | "closing_process";

export const TASK_STATUSES = ["Not Started", "In Progress", "Complete"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Created together, in this order, the moment a company's "Going Out of
// Business?" toggle flips to Yes. E-File Sales Tax isn't in this list - that
// one gets its status field flipped to Inactive directly instead of
// becoming a task, since there's no document to close it out with.
export const CLOSING_PROCESS_TASK_TITLES = [
  "Company Dissolution",
  "Sales Tax and RT Account Closure",
  "DBPR Licenses Closure",
  "Food Permit Closure",
] as const;
