import type { ReactNode } from 'react';
const MAP: Record<string, string> = { ACTIVE: 'badge-green', APPROVED: 'badge-green', PENDING: 'badge-amber', SUBMITTED: 'badge-amber', INFO_NEEDED: 'badge-amber', OPEN: 'badge-amber', BLOCKED: 'badge-red', REJECTED: 'badge-red', EXPIRED: 'badge-gray', CLOSED: 'badge-gray' };
export const Status = ({ s }: { s: string }) => <span className={MAP[s] ?? 'badge-gray'}>{s}</span>;
export const PageHead = ({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center gap-3"><div className="mr-auto"><h2 className="text-2xl font-extrabold">{title}</h2>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>{children}</div>
);
export const Initials = ({ name }: { name?: string }) => (
  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-extrabold text-brand-dark dark:bg-emerald-950 dark:text-emerald-300">{(name ?? '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
);
