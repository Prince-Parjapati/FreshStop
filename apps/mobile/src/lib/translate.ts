/**
 * English -> Hindi transliteration/translation helper (same approach as the original MandiMart app).
 * Sends only the text typed in the field to Google's public translate endpoint; always user-triggered or
 * for generic item names. Fails silently (returns '') offline so the user can type Hindi manually.
 */
export async function toHindi(text: string): Promise<string> {
  const q = text.trim(); if (q.length < 2 || /[ऀ-ॿ]/.test(q)) return '';
  try {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=${encodeURIComponent(q)}`, { signal: ctl.signal });
    clearTimeout(to); if (!r.ok) return '';
    const j = await r.json(); return String(j?.[0]?.map((x: any) => x?.[0]).join('') ?? '').trim();
  } catch { return ''; }
}
