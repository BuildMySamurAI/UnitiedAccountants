// Per-company or per-client task tracking. 'closing_process' is the only
// fixed type the portal still creates itself (via the Going Out of Business
// toggle); 'custom' covers everything staff or the client add by hand.
// 'ebt_application' is kept in the type union only for old rows - EBT moved
// to being a company_services type, it's no longer offered as a task.
export type TaskTypeKey = "ebt_application" | "custom" | "closing_process";

export const TASK_STATUSES = ["Not Started", "In Progress", "Complete"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Only client-submitted requests ever start "pending" - everything the
// owner creates directly is auto-approved, since the owner creating it *is*
// the approval. Staff never create tasks at all, so this gate only ever
// matters for the client -> owner request path.
export type ApprovalStatus = "pending" | "approved" | "rejected";

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
