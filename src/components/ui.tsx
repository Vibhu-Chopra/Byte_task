import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { imageUri } from "../services/images";

export const colors = {
  bg: "#101311",
  panel: "#1a201c",
  border: "#303b33",
  text: "#f1f5ee",
  muted: "#a2b3a5",
  green: "#bcf685",
  danger: "#ffaaa6",
};
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  color = colors.text,
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  title,
  onPress,
  icon,
  secondary,
  danger,
  disabled,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const foreground = danger
    ? colors.danger
    : secondary
      ? colors.text
      : colors.bg;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon && <Icon name={icon} color={foreground} size={19} />}
      <Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
    </Pressable>
  );
}
export function Chip({
  title,
  active,
  onPress,
}: {
  title: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        active && { backgroundColor: colors.green, borderColor: colors.green },
      ]}
    >
      <Text
        style={{
          color: active ? colors.bg : colors.muted,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function SavedImage({
  filename,
  uri,
  large,
}: {
  filename?: string;
  uri?: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const source = uri ?? (filename ? imageUri(filename) : "");
  return failed ? (
    <View style={[styles.image, large && { height: 300 }, styles.center]}>
      <Icon name="image-outline" color={colors.muted} />
      <Text style={styles.muted}>Image unavailable. Edit to replace it.</Text>
    </View>
  ) : (
    <Image
      accessibilityLabel="Saved image"
      source={{ uri: source }}
      onError={() => setFailed(true)}
      style={[styles.image, large && { height: 300 }]}
      resizeMode={large ? "contain" : "cover"}
    />
  );
}
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: 22,
    gap: 22,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 780,
    alignSelf: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  eyebrow: {
    color: colors.green,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  heading: { color: colors.text, fontSize: 21, fontWeight: "600" },
  body: { color: colors.text, fontSize: 16, lineHeight: 25 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: colors.green,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  secondary: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { fontSize: 14, fontWeight: "700" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    minHeight: 50,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 9,
  },
  image: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    backgroundColor: "#242d27",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
});
