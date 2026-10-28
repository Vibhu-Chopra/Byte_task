import type { SQLiteDatabase } from "expo-sqlite";
import { Item, ItemDraft, validateDraft } from "../domain/items";

export function createItemRepository(db: SQLiteDatabase) {
  return {
    async list(): Promise<Item[]> {
      const rows = await db.getAllAsync<Omit<Item, "tags">>(
        "SELECT * FROM items ORDER BY updatedAt DESC, id DESC",
      );
      const tags = await db.getAllAsync<{ item_id: string; tag_name: string }>(
        "SELECT * FROM item_tags ORDER BY tag_name",
      );
      const byItem = new Map<string, string[]>();
      for (const tag of tags)
        byItem.set(tag.item_id, [
          ...(byItem.get(tag.item_id) ?? []),
          tag.tag_name,
        ]);
      return rows.map((row) => ({ ...row, tags: byItem.get(row.id) ?? [] }));
    },
    async save(id: string, input: ItemDraft, existing?: Item): Promise<void> {
      const draft = validateDraft(input);
      const now = new Date().toISOString();
      // One transaction ensures an item and its tags are saved together or not at all.
      await db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync(
          `INSERT INTO items (id, type, title, content, createdAt, updatedAt, archivedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET type=excluded.type, title=excluded.title,
          content=excluded.content, updatedAt=excluded.updatedAt`,
          id,
          draft.type,
          draft.title,
          draft.content,
          existing?.createdAt ?? now,
          now,
          existing?.archivedAt ?? null,
        );
        await tx.runAsync("DELETE FROM item_tags WHERE item_id = ?", id);
        for (const tag of draft.tags) {
          await tx.runAsync(
            "INSERT OR IGNORE INTO tags (name) VALUES (?)",
            tag,
          );
          await tx.runAsync(
            "INSERT INTO item_tags (item_id, tag_name) VALUES (?, ?)",
            id,
            tag,
          );
        }
        await tx.runAsync(
          "DELETE FROM tags WHERE name NOT IN (SELECT tag_name FROM item_tags)",
        );
      });
    },
    async archive(id: string, archived: boolean) {
      const now = new Date().toISOString();
      await db.runAsync(
        "UPDATE items SET archivedAt = ?, updatedAt = ? WHERE id = ?",
        archived ? now : null,
        now,
        id,
      );
    },
    async remove(id: string) {
      await db.withExclusiveTransactionAsync(async (tx) => {
        // Expo opens a separate transaction connection. Its foreign-key pragma
        // may differ, so do not depend on ON DELETE CASCADE for this cleanup.
        await tx.runAsync("DELETE FROM item_tags WHERE item_id = ?", id);
        await tx.runAsync("DELETE FROM items WHERE id = ?", id);
        await tx.runAsync(
          "DELETE FROM tags WHERE name NOT IN (SELECT tag_name FROM item_tags)",
        );
      });
    },
  };
}
