export type Collection = "profile" | "jobs" | "searches" | "watchlist" | "tailored";

/** A minimal per-user document store. Every document carries its own `id`. */
export interface DocStore {
  get<T>(col: Collection, id: string): Promise<T | null>;
  getMany<T>(col: Collection, ids: string[]): Promise<Map<string, T>>;
  set<T extends { id: string }>(col: Collection, doc: T): Promise<void>;
  setMany<T extends { id: string }>(col: Collection, docs: T[]): Promise<void>;
  update(col: Collection, id: string, patch: Record<string, unknown>): Promise<void>;
  delete(col: Collection, id: string): Promise<void>;
  /** All documents, optionally where `field` equals a string value. */
  list<T>(col: Collection, where?: [field: string, value: string]): Promise<T[]>;
}
