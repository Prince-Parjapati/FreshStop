import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FS from 'expo-file-system/legacy';
export async function sharePdf(html: string, name = 'document') {
  const { uri } = await Print.printToFileAsync({ html });
  const dest = FS.cacheDirectory + name.replace(/[^\w-]/g, '_') + '.pdf';
  await FS.moveAsync({ from: uri, to: dest });
  await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: name });
}
export async function shareText(fileName: string, content: string, mime = 'text/csv') {
  const p = FS.cacheDirectory + fileName; await FS.writeAsStringAsync(p, content); await Sharing.shareAsync(p, { mimeType: mime });
}
export const toCsv = (rows: Record<string, unknown>[]) => { if (!rows.length) return ''; const k = Object.keys(rows[0]!); return [k.join(','), ...rows.map((r) => k.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n'); };

export const printHtml = (html: string) => Print.printAsync({ html });

export async function makePdf(html: string, name: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html });
  const dest = FS.cacheDirectory + name.replace(/[^\w-]/g, '_') + '.pdf';
  try { await FS.deleteAsync(dest, { idempotent: true }); } catch {}
  await FS.moveAsync({ from: uri, to: dest });
  return dest;
}
/**
 * One-tap send of a PDF to a customer's WhatsApp number.
 * Android: opens the customer's chat in WhatsApp / WhatsApp Business with the PDF attached (jid extra).
 * iOS (and fallback): system share sheet, because iOS cannot target a WhatsApp contact with a file.
 * Returns 'direct' or 'sheet' so the UI can tell the user what happened.
 */
export async function sendPdfToWhatsApp(pdfUri: string, phone: string | null | undefined, caption: string): Promise<'direct' | 'sheet'> {
  const digits = (phone ?? '').replace(/\D/g, ''); const num = digits.length === 10 ? '91' + digits : digits;
  if (Platform.OS === 'android' && num.length >= 11) {
    try {
      const stream = await FS.getContentUriAsync(pdfUri);
      for (const pkg of ['com.whatsapp', 'com.whatsapp.w4b']) {
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.SEND', { type: 'application/pdf', packageName: pkg, flags: 1, extra: { 'android.intent.extra.STREAM': stream, 'android.intent.extra.TEXT': caption, jid: `${num}@s.whatsapp.net` } });
          return 'direct';
        } catch { /* try next package */ }
      }
    } catch { /* fall through to share sheet */ }
  }
  await Sharing.shareAsync(pdfUri, { mimeType: 'application/pdf', dialogTitle: 'Send via WhatsApp' });
  return 'sheet';
}
