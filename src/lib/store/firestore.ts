import { adminFirestore } from "../firebaseAdmin";
import type { Collection, DocStore } from "./types";

// Production backend: users/{uid}/{collection}/{id}
const CHUNK = 400; // below Firestore's 500-writes-per-batch limit

export function firestoreStore(uid: string): DocStore {
  const db = adminFirestore();
  const col = (c: Collection) => db.collection("users").doc(uid).collection(c);

  return {
    async get<T>(c: Collection, id: string) {
      const snap = await col(c).doc(id).get();
      return snap.exists ? (snap.data() as T) : null;
    },
    async getMany<T>(c: Collection, ids: string[]) {
      const out = new Map<string, T>();
      for (let i = 0; i < ids.length; i += 100) {
        const refs = ids.slice(i, i + 100).map((id) => col(c).doc(id));
        if (!refs.length) continue;
        for (const snap of await db.getAll(...refs)) {
          if (snap.exists) out.set(snap.id, snap.data() as T);
        }
      }
      return out;
    },
    async set(c, doc) {
      await col(c).doc(doc.id).set(doc);
    },
    async setMany(c, docs) {
      for (let i = 0; i < docs.length; i += CHUNK) {
        const batch = db.batch();
        for (const d of docs.slice(i, i + CHUNK)) batch.set(col(c).doc(d.id), d);
        await batch.commit();
      }
    },
    async update(c, id, patch) {
      await col(c).doc(id).set(patch, { merge: true });
    },
    async delete(c, id) {
      await col(c).doc(id).delete();
    },
    async list<T>(c: Collection, where?: [string, string]) {
      const snap = where ? await col(c).where(where[0], "==", where[1]).get() : await col(c).get();
      return snap.docs.map((d) => d.data() as T);
    },
  };
}
