# Byte_task — Byte Inbox

A local, single-device inbox built with React Native, Expo, and TypeScript. Save notes, links, and images; search, filter by tag, edit, archive, restore, and permanently delete them. No account or backend is required.

## Run

```sh
npm install
npm start
```

Scan the QR code with a compatible Expo Go app, or press `a` for an Android emulator. `npm run android` launches Android directly. iOS simulator development requires macOS; a physical iPhone can connect through Expo Go. This project targets Android and iOS, not the browser. Check `package.json` for the Expo SDK version and use a matching Expo Go/development build.

```sh
npm run typecheck
npm test
npx expo export --platform android --platform ios
```

## How it works

- `app/`: Expo Router inbox, editor, and item detail routes.
- `src/domain/items.ts`: item types, validation, tag normalization, and search.
- `src/db/schema.ts`: version 1 SQLite schema, with foreign keys and WAL enabled.
- `src/repositories/items.ts`: parameterized CRUD queries; item/tag changes are atomic transactions.
- `src/state/InboxProvider.tsx`: shared item state and coordination of database and image operations.
- `src/services/images.ts`: copies selected images from temporary storage into the app document directory. Only relative filenames are persisted so a changed app sandbox path does not break saved images.

SQLite is the source of truth. The provider reloads after mutations. Search filters the loaded collection in memory, case-insensitively; a larger collection could use indexed SQL search later. Archive is a timestamp, not deletion. Creation dates survive edits. Tags are normalized to lowercase and deduplicated. Only HTTP(S) URLs can be saved/opened.

Image saves copy the file before committing the database entry; failed saves clean up the copy. Replacing/deleting images commits the database operation before best-effort file cleanup. A crash between these operations can leave an unused image file, but does not intentionally leave a saved item pointing to a deleted file. No cloud sync or automatic export is included; uninstalling the app or clearing its storage may remove the collection.

## Verification

Automated tests run the real repository against Node's SQLite engine. They cover close/reopen persistence, CRUD, tag cleanup, search, archive/restore, rollback on failure, and input validation. They do not replace device testing of Expo's native bindings and image picker.

Device acceptance checklist:

1. Save a note with punctuation, multiline content, and repeated tags. Verify tags deduplicate.
2. Save a valid URL; reject an empty title, invalid URL, and non-HTTP scheme.
3. Pick an image, save, terminate the app, reopen, and verify the image and all items remain.
4. Search text and tags; combine a search with a tag filter; clear filters.
5. Edit an item and confirm creation time is unchanged. Cancel editing and confirm discard protection.
6. Archive, find under Archived, edit there, restore, and find in Inbox.
7. Cancel permanent deletion, then confirm it. Verify the item is gone after relaunch.
8. Cancel the image picker; replace an existing image; verify missing images show a recovery message.
9. Check Android back, iOS swipe-back, keyboard scrolling, larger text, and photo permission denial.

## Dependency audit

The initial npm audit reports eight findings (three high, five low) inherited through Expo's tooling, including Zod 3 and deepmerge. npm's proposed automatic fix downgrades Expo to SDK 51; that incompatible downgrade was not applied. Review upstream Expo updates before preparing a release. These findings remain unresolved.

