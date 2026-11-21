import { useEffect, useState } from 'react';
import { getRepo } from '../db/expo';
import type { Repo } from '../db/repo';
export const today = () => new Date().toISOString().slice(0, 10);
export function useRepo(): Repo | null {
  const [r, setR] = useState<Repo | null>(null);
  useEffect(() => { getRepo().then(setR); }, []);
  return r;
}
