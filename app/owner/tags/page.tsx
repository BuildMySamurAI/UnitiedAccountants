import { listLocationTags, type GhlLocationTag } from "@/lib/ghl/client";
import { isHiddenTag } from "@/lib/tags";
import { ConsoleTopBar } from "@/components/console/ui";
import { TagsManager } from "./tags-manager";

export default async function TagsPage() {
  let tags: GhlLocationTag[] = [];
  let loadError: string | null = null;
  try {
    tags = (await listLocationTags())
      .filter((t) => !isHiddenTag(t.name))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Couldn't load tags from GHL.";
  }

  return (
    <>
      <ConsoleTopBar searchAction="/owner/contacts" crumbs={[{ label: "Tags" }]} />
      <div className="wrap">
        <h2 className="page">Tags</h2>
        <p className="sub">The approved tag list, synced with GHL. System tags are hidden and can't be changed here.</p>
        {loadError ? (
          <p style={{ fontSize: 12.5, color: "var(--red)" }}>Couldn&apos;t load tags: {loadError}</p>
        ) : (
          <TagsManager tags={tags} />
        )}
      </div>
    </>
  );
}
