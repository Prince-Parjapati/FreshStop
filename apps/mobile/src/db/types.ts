/** Minimal sync-ish DB port so the same repo runs on expo-sqlite (app) and node:sqlite (tests). */
export interface Db {
  exec(sql: string): Promise<void> | void;
  run(sql: string, params?: unknown[]): Promise<void> | void;
  all<T = any>(sql: string, params?: unknown[]): Promise<T[]> | T[];
  tx<T>(fn: () => Promise<T>): Promise<T>;
}
