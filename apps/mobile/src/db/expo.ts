import * as SQLite from 'expo-sqlite';
import type { Db } from './types';
import { migrate } from './migrate';
import { Repo } from './repo';

let repo: Repo | null = null;
export async function getRepo(deviceId = 'local'): Promise<Repo> {
  if (repo) return repo;
  const raw = await SQLite.openDatabaseAsync('mandimart.db');
  await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const db: Db = {
    exec: (s) => raw.execAsync(s),
    run: async (s, p = []) => { await raw.runAsync(s, p as any[]); },
    all: (s, p = []) => raw.getAllAsync(s, p as any[]) as Promise<any[]>,
    tx: async (fn) => { let r!: any; await raw.withExclusiveTransactionAsync(async () => { r = await fn(); }); return r; },
  };
  await migrate(db);
  repo = new Repo(db, deviceId);
  await repo.seedSystemAccounts();
  return repo;
}
