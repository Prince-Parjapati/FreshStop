import * as SQLite from 'expo-sqlite';
import type { Db } from './types';
import { migrate } from './migrate';
import { Repo } from './repo';

let repo: Repo | null = null;
export async function getRepo(deviceId = 'local'): Promise<Repo> {
  if (repo) return repo;
  const raw = await SQLite.openDatabaseAsync('mandimart.db');
  await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  // Inside withExclusiveTransactionAsync every statement must go through the transaction's own connection.
  let cur: Pick<SQLite.SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync'> = raw;
  const db: Db = {
    exec: (q) => cur.execAsync(q),
    run: async (q, p = []) => { await cur.runAsync(q, p as any[]); },
    all: (q, p = []) => cur.getAllAsync(q, p as any[]) as Promise<any[]>,
    tx: async (fn) => {
      let r!: any;
      await raw.withExclusiveTransactionAsync(async (txn) => { cur = txn; try { r = await fn(); } finally { cur = raw; } });
      return r;
    },
  };
  await migrate(db);
  repo = new Repo(db, deviceId);
  await repo.seedSystemAccounts();
  return repo;
}
