const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const ts = require("typescript");

// Run the actual repository against SQLite without loading React Native bindings.
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  module._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
};
const { schema } = require("../src/db/schema.ts");
const { createItemRepository } = require("../src/repositories/items.ts");
const {
  validateDraft,
  parseTags,
  filterItems,
} = require("../src/domain/items.ts");

function adapter(database) {
  return {
    async getAllAsync(sql, ...params) {
      return database.prepare(sql).all(...params);
    },
    async runAsync(sql, ...params) {
      return database.prepare(sql).run(...params);
    },
    async withExclusiveTransactionAsync(callback) {
      database.exec("BEGIN IMMEDIATE");
      try {
        await callback(this);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

test("items persist across reopen; edits, literal search, tags, archive/restore, and deletion work", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "byte-test-"));
  const filename = path.join(directory, "inbox.db");
  let db = new DatabaseSync(filename);
  try {
    db.exec(schema);
    let repo = createItemRepository(adapter(db));
    await repo.save("note-1", {
      type: "note",
      title: "Today's idea",
      content: "It's 100% useful; DROP TABLE items;",
      tags: ["Work", "work", "ideas"],
    });
    await repo.save("link-1", {
      type: "link",
      title: "Expo docs",
      content: "https://docs.expo.dev",
      tags: ["work"],
    });
    await repo.save("image-1", {
      type: "image",
      title: "Sketch",
      content: "photo.jpg",
      tags: ["design"],
    });
    db.close();
    db = new DatabaseSync(filename);
    db.exec(schema);
    repo = createItemRepository(adapter(db));
    let items = await repo.list();
    assert.equal(items.length, 3);
    let note = items.find((item) => item.id === "note-1");
    assert.deepEqual(note.tags, ["ideas", "work"]);
    assert.equal(filterItems(items, false, "100%", null).length, 1);
    assert.equal(filterItems(items, false, "EXPO", "work").length, 1);
    assert.equal(filterItems(items, false, "photo.jpg", null).length, 0);
    const created = note.createdAt;
    await repo.archive(note.id, true);
    items = await repo.list();
    note = items.find((item) => item.id === note.id);
    assert.equal(filterItems(items, true, "", null).length, 1);
    assert.equal(filterItems(items, false, "", null).length, 2);
    await repo.save(
      note.id,
      { ...note, title: "Changed", tags: ["personal"] },
      note,
    );
    note = (await repo.list()).find((item) => item.id === note.id);
    assert.equal(note.title, "Changed");
    assert.equal(note.createdAt, created);
    assert.ok(note.archivedAt);
    assert.deepEqual(note.tags, ["personal"]);
    await repo.archive(note.id, false);
    assert.equal(
      (await repo.list()).find((item) => item.id === note.id).archivedAt,
      null,
    );
    // Model Expo's transaction connection, which may not enable foreign keys.
    db.exec("PRAGMA foreign_keys = OFF");
    await repo.remove(note.id);
    assert.equal((await repo.list()).length, 2);
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM item_tags WHERE item_id = ?")
        .get(note.id).n,
      0,
    );
    assert.equal(
      db
        .prepare("SELECT COUNT(*) AS n FROM tags WHERE name = ?")
        .get("personal").n,
      0,
    );
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true });
  }
});

test("a tag write failure rolls back the entire item update", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(schema);
    const repo = createItemRepository(adapter(db));
    await repo.save("a", {
      type: "note",
      title: "Original",
      content: "Keep me",
      tags: ["safe"],
    });
    db.exec(
      "CREATE TRIGGER reject_tag BEFORE INSERT ON tags WHEN NEW.name = 'fail' BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
    );
    const original = (await repo.list())[0];
    await assert.rejects(
      repo.save(
        "a",
        { ...original, title: "Broken", tags: ["fail"] },
        original,
      ),
    );
    const after = (await repo.list())[0];
    assert.equal(after.title, "Original");
    assert.deepEqual(after.tags, ["safe"]);
  } finally {
    db.close();
  }
});

test("validation rejects empty content and unsafe links, normalizes tags", () => {
  const draft = { type: "note", title: "Title", content: "Text", tags: [] };
  assert.throws(() => validateDraft({ ...draft, title: "  " }), /title/);
  assert.throws(() => validateDraft({ ...draft, content: "  " }), /content/);
  assert.throws(
    () => validateDraft({ ...draft, type: "image", content: "" }),
    /image/,
  );
  for (const content of [
    "javascript:alert(1)",
    "file:///etc/passwd",
    "not a link",
    "https://",
  ]) {
    assert.throws(
      () => validateDraft({ ...draft, type: "link", content }),
      /http/,
    );
  }
  assert.equal(
    validateDraft({ ...draft, type: "link", content: " https://example.com " })
      .content,
    "https://example.com/",
  );
  assert.deepEqual(parseTags(" Work, #ideas,work, , IDEAS "), [
    "work",
    "ideas",
  ]);
  assert.throws(
    () =>
      validateDraft({
        ...draft,
        tags: Array.from({ length: 13 }, (_, i) => `tag${i}`),
      }),
    /12 tags/,
  );
});
