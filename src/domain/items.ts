export type ItemType = "note" | "link" | "image";
export type Item = {
  id: string;
  type: ItemType;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
export type ItemDraft = Pick<Item, "type" | "title" | "content" | "tags">;

export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(",")
        .map((tag) => tag.trim().replace(/^#+/, "").toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function validateDraft(draft: ItemDraft): ItemDraft {
  const title = draft.title.trim();
  let content = draft.content.trim();
  if (!title) throw new Error("Give this item a title.");
  if (title.length > 160)
    throw new Error("Keep the title under 160 characters.");
  if (!content)
    throw new Error(
      draft.type === "image"
        ? "Choose an image first."
        : "Add some content before saving.",
    );
  if (draft.type === "link") {
    try {
      const url = new URL(content);
      if (!["https:", "http:"].includes(url.protocol) || !url.hostname)
        throw new Error();
      content = url.href;
    } catch {
      throw new Error("Enter a complete http:// or https:// link.");
    }
  }
  const tags = parseTags(draft.tags.join(","));
  if (tags.length > 12 || tags.some((tag) => tag.length > 32))
    throw new Error("Use up to 12 tags, each 32 characters or fewer.");
  return { ...draft, title, content, tags };
}

export function filterItems(
  items: Item[],
  archived: boolean,
  query: string,
  tag: string | null,
): Item[] {
  const search = query.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      Boolean(item.archivedAt) === archived &&
      (!tag || item.tags.includes(tag)) &&
      (!search ||
        [item.title, item.type === "image" ? "" : item.content, ...item.tags]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search)),
  );
}
