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
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to remove tag." };
  }

  revalidateTagPages();
  return { ok: true };
}
