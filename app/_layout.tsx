import React, { Component } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider } from "expo-sqlite";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InboxProvider } from "../src/state/InboxProvider";
import { schema } from "../src/db/schema";
import { Button, colors, styles } from "../src/components/ui";

class DatabaseBoundary extends Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.heading}>Could not open your inbox</Text>
        <Text style={styles.muted}>
          Your saved data has not been reset. Try opening it again.
        </Text>
        <Button
          title="Try again"
          onPress={() => this.setState({ failed: false })}
        />
      </View>
    ) : (
      this.props.children
    );
  }
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <DatabaseBoundary>
        <LocalDatabase />
      </DatabaseBoundary>
    </SafeAreaProvider>
  );
}
function LocalDatabase() {
  return (
    <SQLiteProvider
      databaseName="byte-inbox.db"
      onInit={async (db) => {
        const version = await db.getFirstAsync<{ user_version: number }>(
          "PRAGMA user_version",
        );
        if ((version?.user_version ?? 0) > 1)
          throw new Error("Unsupported database version");
        await db.execAsync(schema);
      }}
    >
      <InboxProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="editor"
            options={{ title: "Capture something", presentation: "modal" }}
          />
          <Stack.Screen
            name="item/[id]"
            options={{ title: "Your collection", headerBackTitle: "Inbox" }}
          />
        </Stack>
      </InboxProvider>
    </SQLiteProvider>
  );
}
