import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSQLiteContext } from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { Item, ItemDraft, validateDraft } from "../domain/items";
import { createItemRepository } from "../repositories/items";
import { persistImage, removeImage } from "../services/images";

type InboxState = {
  items: Item[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (
    draft: ItemDraft,
    existing?: Item,
    pickedImage?: string,
  ) => Promise<string>;
  archive: (item: Item) => Promise<void>;
  remove: (item: Item) => Promise<void>;
};
const Context = createContext<InboxState | null>(null);
export function InboxProvider({ children }: React.PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createItemRepository(db), [db]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setItems(await repository.list());
      setError(null);
    } catch {
      setError("Could not read your inbox. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [repository]);
  useEffect(() => {
    let active = true;
    repository.list().then(
      (savedItems) => {
        if (!active) return;
        setItems(savedItems);
        setError(null);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError("Could not read your inbox. Please try again.");
        setLoading(false);
      },
    );
    return () => { active = false; };
  }, [repository]);

  async function save(input: ItemDraft, existing?: Item, pickedImage?: string) {
    const draft = validateDraft(input);
    const id = existing?.id ?? Crypto.randomUUID();
    let copied: string | undefined;
    try {
      if (draft.type === "image" && pickedImage) {
        copied = persistImage(pickedImage);
        draft.content = copied;
      }
      await repository.save(id, draft, existing);
    } catch (error) {
      if (copied) {
        try {
          removeImage(copied);
        } catch {
          /* A later cleanup can remove an orphan. */
        }
      }
      throw error;
    }
    if (existing?.type === "image" && existing.content !== draft.content) {
      try {
        removeImage(existing.content);
      } catch {
        /* The saved item remains valid if cleanup fails. */
      }
    }
    await refresh();
    return id;
  }
  async function archive(item: Item) {
    await repository.archive(item.id, !item.archivedAt);
    await refresh();
  }
  async function remove(item: Item) {
    await repository.remove(item.id);
    if (item.type === "image") {
      try {
        removeImage(item.content);
      } catch {
        /* Deletion has already committed. */
      }
    }
    await refresh();
  }
  return (
    <Context.Provider
      value={{ items, loading, error, refresh, save, archive, remove }}
    >
      {children}
    </Context.Provider>
  );
}
export function useInbox() {
  const value = useContext(Context);
  if (!value) throw new Error("useInbox must be inside InboxProvider");
  return value;
}
