import React, { useRef, useState } from "react";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useInbox } from "../../src/state/InboxProvider";
import { Button, Chip, SavedImage, styles } from "../../src/components/ui";

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loading, archive, remove } = useInbox();
  const item = items.find((i) => i.id === id);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  if (!item)
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.heading}>
          {loading ? "Opening item…" : "Item not found"}
        </Text>
        <Button title="Back to inbox" onPress={() => router.replace("/")} />
      </View>
    );
  async function act(action: () => Promise<void>, exit = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
      if (exit) router.replace("/");
    } catch {
      setError(
        "That did not work. Your item is still available; please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.between}>
        <Text style={styles.eyebrow}>{item.type.toUpperCase()}</Text>
        {item.archivedAt && <Chip title="Archived" />}
      </View>
      <Text selectable style={styles.title}>
        {item.title}
      </Text>
      {item.type === "image" ? (
        <SavedImage key={item.content} filename={item.content} large />
      ) : (
        <View style={styles.panel}>
          <Text selectable style={styles.body}>
            {item.content}
          </Text>
        </View>
      )}
      {item.type === "link" && (
        <Button
          title="Open link"
          icon="open-outline"
          disabled={busy}
          onPress={() => void act(() => Linking.openURL(item.content))}
        />
      )}
      <View style={styles.wrap}>
        {item.tags.map((tag) => (
          <Chip key={tag} title={`#${tag}`} />
        ))}
      </View>
      <View style={{ gap: 4 }}>
        <Text style={styles.muted}>
          Created {new Date(item.createdAt).toLocaleString()}
        </Text>
        <Text style={styles.muted}>
          Updated {new Date(item.updatedAt).toLocaleString()}
        </Text>
      </View>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button
        title="Edit item"
        icon="create-outline"
        disabled={busy}
        onPress={() =>
          router.push({ pathname: "/editor", params: { id: item.id } })
        }
      />
      <Button
        title={item.archivedAt ? "Restore to inbox" : "Archive item"}
        icon={item.archivedAt ? "arrow-undo-outline" : "archive-outline"}
        secondary
        disabled={busy}
        onPress={() => void act(() => archive(item))}
      />
      <Button
        title="Delete permanently"
        icon="trash-outline"
        secondary
        danger
        disabled={busy}
        onPress={() =>
          Alert.alert(
            "Delete this item?",
            "This permanently removes the item and its saved image. You cannot undo this.",
            [
              { text: "Keep item", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => void act(() => remove(item), true),
              },
            ],
          )
        }
      />
    </ScrollView>
  );
}
