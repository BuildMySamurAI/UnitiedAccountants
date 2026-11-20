"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listLocationTags, createLocationTag, renameLocationTag, deleteLocationTag } from "@/lib/ghl/client";
import { isHiddenTag } from "@/lib/tags";

export type TagActionResult = { ok: true } | { ok: false; error: string };

// Same owner check as sendTeamMemberPasswordReset (app/owner/actions.ts): the
// caller must be signed in and have a row in `owners`. Done inside every
// action, so it holds even when an action is called directly.
async function requireOwner(): Promise<TagActionResult> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: ownerRow } = await supabaseAdmin().from("owners").select("id").eq("id", user.id).maybeSingle();
  if (!ownerRow) return { ok: false, error: "Only owners can manage tags." };
  return { ok: true };
}

// Everything that reads the tag list (pickers, filters, the Tags screen).
function revalidateTagPages() {
  revalidatePath("/owner/tags");
  revalidatePath("/owner/contacts");
  revalidatePath("/owner/contacts/[profileId]", "page");
  revalidatePath("/owner/bulk-messages");
}

// company_services.tags and tasks.tags hold tag names as plain text, so a tag
// removed or renamed in GHL would otherwise linger there and make the next save
// of that service/task fail the approved-list check. Replaces `oldName` with
// `newName` (or just strips it when newName is null) on every row holding it,
// never leaving duplicates. Returns an error message, or null on success.
async function updateStoredTags(oldName: string, newName: string | null): Promise<string | null> {
  const admin = supabaseAdmin();
  for (const table of ["company_services", "tasks"] as const) {
    const { data, error } = await admin.from(table).select("id, tags").contains("tags", [oldName]);
    if (error) return `Could not update ${table}: ${error.message}`;
    for (const row of (data ?? []) as { id: string; tags: string[] | null }[]) {
      const next: string[] = [];
      for (const t of row.tags ?? []) {
        const mapped = t === oldName ? newName : t;
        if (mapped !== null && !next.includes(mapped)) next.push(mapped);
      }
      const { error: upErr } = await admin.from(table).update({ tags: next }).eq("id", row.id);
      if (upErr) return `Could not update ${table}: ${upErr.message}`;
    }
  }
  return null;
}

export async function addTag(name: string): Promise<TagActionResult> {
  const owner = await requireOwner();
  if (!owner.ok) return owner;

  const trimmed = (name ?? "").trim();
  if (!trimmed) return { ok: false, error: "Tag name can't be empty." };
  // A name matching the system-tag rules would be created and then hidden from
  // every list, so refuse it up front.
  if (isHiddenTag(trimmed)) return { ok: false, error: `"${trimmed}" is reserved for system use.` };

  try {
    const existing = await listLocationTags();
    if (existing.some((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: `A tag named "${trimmed}" already exists.` };
    }
    await createLocationTag(trimmed);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to add tag." };
  }

  revalidateTagPages();
  return { ok: true };
}

export async function renameTag(tagId: string, newName: string): Promise<TagActionResult> {
  const owner = await requireOwner();
  if (!owner.ok) return owner;

  const trimmed = (newName ?? "").trim();
  if (!trimmed) return { ok: false, error: "Tag name can't be empty." };
  if (isHiddenTag(trimmed)) return { ok: false, error: `"${trimmed}" is reserved for system use.` };

  try {
    const existing = await listLocationTags();
    const target = existing.find((t) => t.id === tagId);
    if (!target) return { ok: false, error: "That tag no longer exists." };
    if (isHiddenTag(target.name)) return { ok: false, error: "System tags can't be renamed." };
    if (existing.some((t) => t.id !== tagId && t.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: `A tag named "${trimmed}" already exists.` };
    }
    if (target.name === trimmed) return { ok: true };
    await renameLocationTag(tagId, trimmed);
    const cleanupError = await updateStoredTags(target.name, trimmed);
    if (cleanupError) {
      return { ok: false, error: `Tag was renamed in GHL, but services/tasks were not fully updated. ${cleanupError}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to rename tag." };
  }

  revalidateTagPages();
  return { ok: true };
}

export async function removeTag(tagId: string): Promise<TagActionResult> {
  const owner = await requireOwner();
  if (!owner.ok) return owner;

  try {
    const existing = await listLocationTags();
    const target = existing.find((t) => t.id === tagId);
    if (!target) return { ok: false, error: "That tag no longer exists." };
    if (isHiddenTag(target.name)) return { ok: false, error: "System tags can't be removed." };
    await deleteLocationTag(tagId);
    const cleanupError = await updateStoredTags(target.name, null);
    if (cleanupError) {
      return { ok: false, error: `Tag was removed in GHL, but services/tasks were not fully cleaned up. ${cleanupError}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to remove tag." };
  }

  revalidateTagPages();
  return { ok: true };
}
