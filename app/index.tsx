import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInbox } from "../src/state/InboxProvider";
import { filterItems, ItemType } from "../src/domain/items";
import {
  Button,
  Chip,
  colors,
  Icon,
  IconName,
  SavedImage,
  styles,
} from "../src/components/ui";

const icons: Record<ItemType, IconName> = {
  note: "document-text-outline",
  link: "link-outline",
  image: "image-outline",
};
export default function InboxScreen() {
  const { items, loading, error, refresh } = useInbox();
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const filtered = useMemo(
    () => filterItems(items, archived, query, tag),
    [items, archived, query, tag],
  );
  const tags = [
    ...new Set(
      items
        .filter((item) => Boolean(item.archivedAt) === archived)
        .flatMap((item) => item.tags),
    ),
  ].sort();
  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "left", "right", "bottom"]}
    >
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 22 }}>
            <View style={styles.between}>
              <View style={styles.row}>
                <View
                  style={{
                    backgroundColor: colors.green,
                    borderRadius: 12,
                    padding: 9,
                  }}
                >
                  <Icon name="file-tray-outline" color={colors.bg} />
                </View>
                <Text style={[styles.heading, { letterSpacing: -0.6 }]}>
                  byte
                </Text>
              </View>
              <View style={styles.row}>
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.green,
                  }}
                />
                <Text style={styles.muted}>On your device</Text>
              </View>
            </View>
            <View style={{ gap: 8, paddingTop: 12 }}>
              <Text style={styles.eyebrow}>A LITTLE SPACE FOR EVERYTHING</Text>
              <Text style={styles.title}>Keep the good stuff.</Text>
              <Text style={styles.muted}>
                Ideas, useful links, and images. All in one place.
              </Text>
            </View>
            <Button
              title="Save something"
              icon="add"
              onPress={() => router.push("/editor")}
            />
            <View style={[styles.input, styles.row]}>
              <Icon name="search-outline" color={colors.muted} size={20} />
              <TextInput
                accessibilityLabel="Search saved items"
                placeholder="Search your collection…"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 16,
                  padding: 0,
                }}
              />
              {query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={12}
                  onPress={() => setQuery("")}
                >
                  <Icon name="close-circle" color={colors.muted} size={20} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.between}>
              <View style={styles.row}>
                <Chip
                  title={`Inbox  ${items.filter((i) => !i.archivedAt).length}`}
                  active={!archived}
                  onPress={() => {
                    setArchived(false);
                    setTag(null);
                  }}
                />
                <Chip
                  title={`Archived  ${items.filter((i) => i.archivedAt).length}`}
                  active={archived}
                  onPress={() => {
                    setArchived(true);
                    setTag(null);
                  }}
                />
              </View>
            </View>
            {tags.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                <Chip
                  title="All tags"
                  active={!tag}
                  onPress={() => setTag(null)}
                />
                {tags.map((t) => (
                  <Chip
                    key={t}
                    title={`#${t}`}
                    active={tag === t}
                    onPress={() => setTag(tag === t ? null : t)}
                  />
                ))}
              </ScrollView>
            )}
            <View style={styles.between}>
              <Text style={styles.eyebrow}>
                {archived ? "SET ASIDE" : "YOUR COLLECTION"}
              </Text>
              <Text style={styles.muted}>
                {filtered.length} {filtered.length === 1 ? "item" : "items"} ·
                latest first
              </Text>
            </View>
            {error && (
              <View style={styles.panel}>
                <Text style={styles.error}>{error}</Text>
                <Button
                  title="Retry"
                  secondary
                  onPress={() => void refresh()}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.title}`}
            onPress={() =>
              router.push({ pathname: "/item/[id]", params: { id: item.id } })
            }
            style={({ pressed }) => [
              styles.panel,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.between}>
              <View style={styles.row}>
                <Icon name={icons[item.type]} color={colors.green} size={18} />
                <Text style={styles.eyebrow}>{item.type.toUpperCase()}</Text>
              </View>
              <Text style={[styles.muted, { fontSize: 12 }]}>
                {new Date(item.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
            {item.type === "image" && (
              <SavedImage key={item.content} filename={item.content} />
            )}
            <Text style={styles.heading} numberOfLines={2}>
              {item.title}
            </Text>
            {item.type !== "image" && (
              <Text style={styles.muted} numberOfLines={3}>
                {item.content}
              </Text>
            )}
            {item.tags.length > 0 && (
              <View style={styles.wrap}>
                {item.tags.map((t) => (
                  <Text key={t} style={{ color: colors.green, fontSize: 12 }}>
                    #{t}
                  </Text>
                ))}
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.green} style={{ margin: 30 }} />
          ) : !error ? (
            <View
              style={[styles.panel, styles.center, { paddingVertical: 40 }]}
            >
              <Icon
                name={
                  query || tag
                    ? "search-outline"
                    : archived
                      ? "archive-outline"
                      : "file-tray-outline"
                }
                color={colors.green}
                size={36}
              />
              <Text style={styles.heading}>
                {query || tag
                  ? "Nothing matches just yet"
                  : archived
                    ? "Nothing set aside"
                    : "Make room for your next idea"}
              </Text>
              <Text style={[styles.muted, { textAlign: "center" }]}>
                {query || tag
                  ? "Try a different search or clear your filters."
                  : archived
                    ? "Archived items stay safe here. Restore them anytime."
                    : "Save your first note, link, or image. It will be here when you come back."}
              </Text>
              {(query || tag) && (
                <Button
                  title="Clear filters"
                  secondary
                  onPress={() => {
                    setQuery("");
                    setTag(null);
                  }}
                />
              )}
            </View>
          ) : undefined
        }
        ListFooterComponent={
          <Text style={[styles.muted, { textAlign: "center", fontSize: 12 }]}>
            Your space. Saved locally. No account needed.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
