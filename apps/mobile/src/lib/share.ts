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
