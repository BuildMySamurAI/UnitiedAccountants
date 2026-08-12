// Staff-only task tracking per company - internal assignment/deadline/status
// tracking, not shown to clients or managers. EBT Application is the first
// concrete task type; 'custom' exists so ad-hoc client tasks (a later,
// separate request) can reuse this same table without a schema change.
export const TASK_TYPES = [{ key: "ebt_application", label: "EBT Application" }] as const;

export type TaskTypeKey = "ebt_application" | "custom";

export const TASK_STATUSES = ["Not Started", "In Progress", "Complete"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
