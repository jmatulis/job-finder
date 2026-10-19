import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Collection, DocStore } from "./types";

// Local development backend: one table of JSON documents.
function open() {
  const file = process.env.JOBFINDER_DB ?? path.join(process.cwd(), "data", "jobfinder.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`CREATE TABLE IF NOT EXISTS docs (
    uid TEXT NOT NULL,
    col TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    PRIMARY KEY (uid, col, id)
  )`);
  return db;
}

const globalForDb = globalThis as unknown as { jobFinderSqlite?: Database.Database };
const db = () => (globalForDb.jobFinderSqlite ??= open());

export function sqliteStore(uid: string): DocStore {
  const parse = <T>(row: { data: string } | undefined) => (row ? (JSON.parse(row.data) as T) : null);
  const put = (col: Collection, doc: { id: string }) =>
    db().prepare("INSERT OR REPLACE INTO docs (uid, col, id, data) VALUES (?, ?, ?, ?)").run(uid, col, doc.id, JSON.stringify(doc));

  return {
    async get<T>(col: Collection, id: string) {
      return parse<T>(db().prepare("SELECT data FROM docs WHERE uid = ? AND col = ? AND id = ?").get(uid, col, id) as { data: string } | undefined);
    },
    async getMany<T>(col: Collection, ids: string[]) {
      const out = new Map<string, T>();
      const stmt = db().prepare("SELECT data FROM docs WHERE uid = ? AND col = ? AND id = ?");
      for (const id of ids) {
        const doc = parse<T>(stmt.get(uid, col, id) as { data: string } | undefined);
        if (doc) out.set(id, doc);
      }
      return out;
    },
    async set(col, doc) {
      put(col, doc);
    },
    async setMany(col, docs) {
      db().transaction(() => docs.forEach((d) => put(col, d)))();
    },
    async update(col, id, patch) {
      const cur = await this.get<Record<string, unknown>>(col, id);
      if (cur) put(col, { ...cur, ...patch, id });
    },
    async delete(col, id) {
      db().prepare("DELETE FROM docs WHERE uid = ? AND col = ? AND id = ?").run(uid, col, id);
    },
    async list<T>(col: Collection, where?: [string, string]) {
      const rows = (
        where
          ? db().prepare("SELECT data FROM docs WHERE uid = ? AND col = ? AND json_extract(data, ?) = ?").all(uid, col, `$.${where[0]}`, where[1])
          : db().prepare("SELECT data FROM docs WHERE uid = ? AND col = ?").all(uid, col)
      ) as { data: string }[];
      return rows.map((r) => JSON.parse(r.data) as T);
    },
  };
}
