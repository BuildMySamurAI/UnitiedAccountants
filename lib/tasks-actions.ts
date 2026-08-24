"use server";

import { supabaseServer } from "@/lib/supabase/server";
import type { TaskTypeKey, TaskStatus } from "@/lib/tasks";

export type ActionResult = { ok: true } | { ok: false; error: string };

function todayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Task creation, reassignment, and approval are owner-only - staff work the
// tasks they're given but never create or route them, and a client's
// request isn't a live task until the owner has approved it. This is the
// one place that check lives, so every action below just calls it.
async function requireOwner(supabase: Awaited<ReturnType<typeof supabaseServer>>): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "You must be signed in.";

  const { data: owner } = await supabase.from("owners").select("id").eq("id", user.id).maybeSingle();
  if (!owner) return "Only the practice owner can do this.";

  return null;
}

// A task is tied to exactly one of companyId (this specific business) or
// profileId (the client as a whole, independent of any one company) - never
// both, never neither. The owner is the only one who creates real tasks
// (from a company's own page or a client's contact page); a client
// submitting the request form goes through here too, but always lands as a
// "pending" request with no assignee - the owner picks that on approval.
export async function addTask(input: {
  companyId?: string;
  profileId?: string;
  taskType: TaskTypeKey;
  title: string;
  description?: string;
  required?: boolean;
  assignedTo?: string;
  deadlineDate?: string;
  createdBy: "team" | "client";
}): Promise<ActionResult> {
  if (!input.companyId && !input.profileId) {
    return { ok: false, error: "Task must be tied to either a company or a client." };
  }
  if (input.companyId && input.profileId) {
    return { ok: false, error: "Task can't be tied to both a company and a client." };
  }

  const supabase = await supabaseServer();

  const isClientRequest = input.createdBy === "client";
  if (!isClientRequest) {
    const denied = await requireOwner(supabase);
    if (denied) return { ok: false, error: denied };
  }

  const { error } = await supabase.from("tasks").insert({
    company_id: input.companyId || null,
    profile_id: input.profileId || null,
    task_type: input.taskType,
    title: input.title,
    description: input.description || null,
    required: isClientRequest ? null : input.required ?? null,
    assigned_to: isClientRequest ? null : input.assignedTo || null,
    deadline_date: isClientRequest ? null : input.deadlineDate || null,
    created_by: input.createdBy,
    approval_status: isClientRequest ? "pending" : "approved",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Status updates (marking progress on work you've been assigned) are open
// to whoever can already see the task - RLS scopes that. Reassigning who
// owns it or when it's due is an owner-only decision.
export async function updateTask(
  taskId: string,
  fields: { status?: TaskStatus; assignedTo?: string | null; deadlineDate?: string }
): Promise<ActionResult> {
  const supabase = await supabaseServer();

  if (fields.assignedTo !== undefined || fields.deadlineDate !== undefined) {
    const denied = await requireOwner(supabase);
    if (denied) return { ok: false, error: denied };
  }

  const update: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (fields.status !== undefined) {
    update.status = fields.status;
    if (fields.status === "Complete") update.completed_at = todayDateOnly();
  }
  if (fields.assignedTo !== undefined) update.assigned_to = fields.assignedTo || null;
  if (fields.deadlineDate !== undefined) update.deadline_date = fields.deadlineDate || null;

  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Turns a pending client request into a real, assigned task. Title/deadline
// can be adjusted at the same time, since the client's own wording or lack
// of a deadline often needs cleaning up before it's handed to someone.
export async function approveTaskRequest(
  taskId: string,
  fields: { assignedTo: string; title?: string; deadlineDate?: string }
): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const denied = await requireOwner(supabase);
  if (denied) return { ok: false, error: denied };

  if (!fields.assignedTo) return { ok: false, error: "Pick who this should go to." };

  const update: Record<string, string | null> = {
    approval_status: "approved",
    assigned_to: fields.assignedTo,
    updated_at: new Date().toISOString(),
  };
  if (fields.title) update.title = fields.title.slice(0, 60);
  if (fields.deadlineDate !== undefined) update.deadline_date = fields.deadlineDate || null;

  const { error } = await supabase.from("tasks").update(update).eq("id", taskId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function rejectTaskRequest(taskId: string): Promise<ActionResult> {
  const supabase = await supabaseServer();
  const denied = await requireOwner(supabase);
  if (denied) return { ok: false, error: denied };

  const { error } = await supabase
    .from("tasks")
    .update({ approval_status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function recordTaskDocumentUpload(input: { taskId: string; storagePath: string; fileName: string }): Promise<ActionResult> {
  const supabase = await supabaseServer();

  const { error } = await supabase.from("task_documents").insert({
    task_id: input.taskId,
    storage_path: input.storagePath,
    file_name: input.fileName,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getTaskDocumentUrl(storagePath: string): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage.from("company-files").createSignedUrl(storagePath, 60 * 5);
  if (error || !data) return null;
  return data.signedUrl;
}
