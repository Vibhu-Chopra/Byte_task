import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  router,
  Stack,
  useLocalSearchParams,
  usePreventRemove,
} from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useInbox } from "../src/state/InboxProvider";
import { Item, ItemType, parseTags } from "../src/domain/items";
import { Button, Chip, colors, SavedImage, styles } from "../src/components/ui";

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { items, loading } = useInbox();
  const existing = items.find((item) => item.id === id);
  if (loading)
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.muted}>Opening item…</Text>
      </View>
    );
  if (id && !existing)
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.heading}>Item not found</Text>
        <Button title="Back to inbox" onPress={() => router.replace("/")} />
      </View>
    );
  return <Editor existing={existing} />;
}
function Editor({ existing }: { existing?: Item }) {
  const { save } = useInbox();
  const [type, setType] = useState<ItemType>(existing?.type ?? "note");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [pickedImage, setPickedImage] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const dirty =
    type !== (existing?.type ?? "note") ||
    title !== (existing?.title ?? "") ||
    content !== (existing?.content ?? "") ||
    tags !== (existing?.tags.join(", ") ?? "") ||
    Boolean(pickedImage);
  const [allowExit, setAllowExit] = useState(false);
  const disablePrevention = usePreventRemove(
    (dirty || busy) && !saved && !allowExit,
    ({ repeat }) => {
      if (saving.current) return;
      Alert.alert("Discard changes?", "Your unsaved changes will be lost.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setAllowExit(true);
            repeat();
          },
        },
      ]);
    },
  );
  React.useEffect(() => {
    if (saved) {
      disablePrevention();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    }
  }, [saved, disablePrevention]);
  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setPickedImage(result.assets[0].uri);
        setContent(result.assets[0].uri);
        setError(null);
      }
    } catch {
      setError(
        "Could not open your photo library. Check photo permissions in Settings and try again.",
      );
    }
  }
  async function submit() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await save(
        { type, title, content, tags: parseTags(tags) },
        existing,
        pickedImage,
      );
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: existing ? "Edit item" : "Capture something",
          gestureEnabled: !busy,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={{ gap: 8 }}>
          <Text style={styles.eyebrow}>
            {existing ? "MAKE IT YOURS" : "OUT OF YOUR HEAD. INTO YOUR INBOX."}
          </Text>
          <Text style={styles.title}>
            {existing ? "A little refinement." : "Worth keeping."}
          </Text>
          <Text style={styles.muted}>
            Save now. Come back to it whenever you like.
          </Text>
        </View>
        {!existing && (
          <View style={styles.row}>
            {(["note", "link", "image"] as ItemType[]).map((t) => (
              <Chip
                key={t}
                title={t[0].toUpperCase() + t.slice(1)}
                active={type === t}
                onPress={() => {
                  if (!busy) {
                    setType(t);
                    setContent("");
                    setPickedImage(undefined);
                    setError(null);
                  }
                }}
              />
            ))}
          </View>
        )}
        <View>
          <Text style={styles.label}>TITLE</Text>
          <TextInput
            accessibilityLabel="Title"
            editable={!busy}
            value={title}
            onChangeText={setTitle}
            maxLength={160}
            placeholder="Give it a name"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        {type === "image" ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.label}>IMAGE</Text>
            {content ? (
              <SavedImage
                key={content}
                uri={pickedImage}
                filename={pickedImage ? undefined : content}
                large
              />
            ) : (
              <View style={[styles.panel, styles.center]}>
                <Text style={styles.muted}>A picture worth holding onto.</Text>
              </View>
            )}
            <Button
              title={content ? "Choose another image" : "Choose an image"}
              icon="image-outline"
              secondary
              disabled={busy}
              onPress={() => void pickImage()}
            />
          </View>
        ) : (
          <View>
            <Text style={styles.label}>{type === "link" ? "URL" : "NOTE"}</Text>
            <TextInput
              accessibilityLabel={type === "link" ? "URL" : "Note"}
              editable={!busy}
              value={content}
              onChangeText={setContent}
              placeholder={
                type === "link"
                  ? "https://example.com"
                  : "An idea, a reminder, a thought…"
              }
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                type === "note" && { minHeight: 220, textAlignVertical: "top" },
              ]}
              multiline={type === "note"}
              autoCapitalize={type === "link" ? "none" : "sentences"}
              autoCorrect={type !== "link"}
              keyboardType={type === "link" ? "url" : "default"}
            />
          </View>
        )}
        <View>
          <Text style={styles.label}>TAGS · OPTIONAL</Text>
          <TextInput
            accessibilityLabel="Tags, separated by commas"
            editable={!busy}
            value={tags}
            onChangeText={setTags}
            placeholder="ideas, work, inspiration"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            style={styles.input}
          />
          <Text style={[styles.muted, { fontSize: 12, marginTop: 8 }]}>
            Separate tags with commas. Use up to 12.
          </Text>
        </View>
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <Button
          title={busy ? "Saving…" : existing ? "Save changes" : "Save to inbox"}
          icon="checkmark"
          disabled={busy}
          onPress={() => void submit()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
