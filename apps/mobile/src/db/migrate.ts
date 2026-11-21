import type { Db } from './types';
import { MIGRATIONS } from './schema';
export async function migrate(db: Db): Promise<void> {
  const rows = await db.all<{ user_version: number }>('PRAGMA user_version');
  let v = rows[0]?.user_version ?? 0;
  for (; v < MIGRATIONS.length; v++) {
    await db.tx(async () => { await db.exec(MIGRATIONS[v]!); });
    await db.exec(`PRAGMA user_version = ${v + 1}`);
  }
}
