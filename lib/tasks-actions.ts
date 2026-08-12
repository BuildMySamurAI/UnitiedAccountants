"use server";

import { supabaseServer } from "@/lib/supabase/server";
import type { TaskTypeKey, TaskStatus } from "@/lib/tasks";

export type ActionResult = { ok: true } | { ok: false; error: string };

function todayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// A task is tied to exactly one of companyId (this specific business) or
// profileId (the client as a whole, independent of any one company) - never
// both, never neither. Used by every entry point: a company's own page, a
// client's contact page (both portals), and the client-facing request form.
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

  const { error } = await supabase.from("tasks").insert({
    company_id: input.companyId || null,
    profile_id: input.profileId || null,
    task_type: input.taskType,
    title: input.title,
    description: input.description || null,
    required: input.required ?? null,
    assigned_to: input.assignedTo || null,
    deadline_date: input.deadlineDate || null,
    created_by: input.createdBy,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateTask(
  taskId: string,
  fields: { status?: TaskStatus; assignedTo?: string | null; deadlineDate?: string }
): Promise<ActionResult> {
  const supabase = await supabaseServer();

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
