import { getLocationTags } from "@/lib/ghl/client";

// The single place that decides which GHL tags are internal and must never
// appear in a picker, filter or chip. Exact names are compared
// case-insensitively; prefixes match the start of the tag.
export const HIDDEN_TAGS = {
  names: ["test-tag-verify", "verified-tag", "client", "entity type selected", "personal tax filer"],
  prefixes: ["ua-pending-", "ua-ref-", "autoloopers-"],
};

export function isHiddenTag(tag: string): boolean {
  const t = tag.trim().toLowerCase();
  return HIDDEN_TAGS.names.includes(t) || HIDDEN_TAGS.prefixes.some((p) => t.startsWith(p));
}

// The fixed list a user may pick from: every tag defined on the GHL location
// minus the hidden ones. Re-read on each call, so tags added in GHL show up
// without a deploy.
export async function getSelectableTags(): Promise<string[]> {
  const all = await getLocationTags();
  return all.filter((t) => !isHiddenTag(t)).sort((a, b) => a.localeCompare(b));
}

// Server-side guard: maps requested names onto the canonical spelling from
// the allowed list, and rejects anything not on it so nothing can create a
// new tag in GHL by way of addContactTags.
export function resolveAllowedTags(
  requested: string[],
  allowed: string[]
): { ok: true; tags: string[] } | { ok: false; unknown: string[] } {
  const byLower = new Map(allowed.map((t) => [t.toLowerCase(), t]));
  const tags: string[] = [];
  const unknown: string[] = [];
  for (const raw of requested) {
    const name = raw.trim();
    if (!name) continue;
    const canonical = byLower.get(name.toLowerCase());
    if (!canonical) unknown.push(name);
    else if (!tags.includes(canonical)) tags.push(canonical);
  }
  return unknown.length ? { ok: false, unknown } : { ok: true, tags };
}
