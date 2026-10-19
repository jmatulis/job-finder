import type { DocStore } from "./types";

export type { DocStore, Collection } from "./types";

/** Firestore when deployed (DATA_BACKEND=firestore), a local SQLite file otherwise. */
export async function storeFor(uid: string): Promise<DocStore> {
  if (process.env.DATA_BACKEND === "firestore") {
    const { firestoreStore } = await import("./firestore");
    return firestoreStore(uid);
  }
  const { sqliteStore } = await import("./sqlite");
  return sqliteStore(uid);
}
