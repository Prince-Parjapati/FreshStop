import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type Lang = 'en' | 'hi';
const D: Record<string, { en: string; hi: string }> = {
  home: { en: 'Home', hi: 'होम' }, entry: { en: 'New Entry', hi: 'नई एंट्री' }, parties: { en: 'Parties', hi: 'पार्टियाँ' }, more: { en: 'More', hi: 'और' },
  today: { en: 'Today', hi: 'आज' }, sales: { en: 'Sales', hi: 'बिक्री' }, receipts: { en: 'Receipts', hi: 'जमा' }, payments: { en: 'Payments', hi: 'भुगतान' },
  cashbank: { en: 'Cash + Bank', hi: 'नकद + बैंक' }, receivable: { en: 'Receivable', hi: 'लेना' }, payable: { en: 'Payable', hi: 'देना' },
  outstanding: { en: 'Outstanding (aging)', hi: 'बकाया (उम्र)' }, save: { en: 'Save', hi: 'सेव करें' }, logout: { en: 'Logout', hi: 'लॉगआउट' },
  daybook: { en: 'Day Book', hi: 'रोज़नामचा' }, recycle: { en: 'Recycle Bin', hi: 'रीसायकल बिन' }, reports: { en: 'Reports', hi: 'रिपोर्ट' },
  backup: { en: 'Backup & Restore', hi: 'बैकअप / रीस्टोर' }, security: { en: 'Security', hi: 'सुरक्षा' }, shop: { en: 'Shop profile', hi: 'दुकान प्रोफाइल' },
  language: { en: 'Language', hi: 'भाषा' }, support: { en: 'Contact support', hi: 'सहायता' }, update: { en: 'Check update', hi: 'अपडेट देखें' },
  delete: { en: 'Delete', hi: 'हटाएं' }, restore: { en: 'Restore', hi: 'वापस लाएं' }, share: { en: 'Share', hi: 'शेयर' }, deleteAccount: { en: 'Delete my account', hi: 'मेरा अकाउंट हटाएं' },
};
interface S { lang: Lang; hide: boolean; setLang: (l: Lang) => void; setHide: (h: boolean) => void; hydrate: () => Promise<void>; }
export const useSettings = create<S>((set, get) => ({
  lang: 'hi', hide: false,
  setLang: (lang) => { set({ lang }); AsyncStorage.setItem('lang', lang).catch(() => {}); },
  setHide: (hide) => { set({ hide }); AsyncStorage.setItem('hide', hide ? '1' : '0').catch(() => {}); },
  hydrate: async () => { const [l, h] = await Promise.all([AsyncStorage.getItem('lang'), AsyncStorage.getItem('hide')]); set({ lang: (l as Lang) || get().lang, hide: h === '1' }); },
}));
export const useT = () => { const lang = useSettings((s) => s.lang); return (k: string) => D[k]?.[lang] ?? k; };
