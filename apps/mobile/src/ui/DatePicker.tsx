import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from './theme';
import { Button } from './kit';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');
export const fmtDMY = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

/** Pure-JS date picker (no native module, works in Expo Go and release). Value is YYYY-MM-DD. */
export function DatePicker({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const { c, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
  const [y, setY] = useState(+base.slice(0, 4)); const [m, setM] = useState(+base.slice(5, 7) - 1);
  const first = new Date(y, m, 1).getDay(); const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const nav = (d: number) => { const n = new Date(y, m + d, 1); setY(n.getFullYear()); setM(n.getMonth()); };
  const pick = (d: number) => { onChange(`${y}-${pad(m + 1)}-${pad(d)}`); setOpen(false); };
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${fmtDMY(value)}`} onPress={() => { setY(+base.slice(0, 4)); setM(+base.slice(5, 7) - 1); setOpen(true); }}
        style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 12, justifyContent: 'center' }}>
        <Text style={{ color: c.text, fontSize: 16 }}>📅  {fmtDMY(value) || 'Select date'}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }} onPress={() => setOpen(false)}>
          <Pressable style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: 16, gap: 10 }} onPress={() => {}}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable accessibilityLabel="Previous month" onPress={() => nav(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.text, fontSize: 22 }}>‹</Text></Pressable>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 16 }}>{MONTHS[m]} {y}</Text>
              <Pressable accessibilityLabel="Next month" onPress={() => nav(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.text, fontSize: 22 }}>›</Text></Pressable>
            </View>
            <View style={{ flexDirection: 'row' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', color: c.muted }}>{d}</Text>)}</View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {cells.map((d, i) => {
                const sel = d !== null && `${y}-${pad(m + 1)}-${pad(d)}` === value;
                return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>{d !== null && <Pressable accessibilityRole="button" onPress={() => pick(d)} style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? c.primary : 'transparent' }}><Text style={{ color: sel ? '#fff' : c.text }}>{d}</Text></Pressable>}</View>;
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><Button kind="ghost" label="Today" onPress={() => { onChange(new Date().toISOString().slice(0, 10)); setOpen(false); }} /></View>
              <View style={{ flex: 1 }}><Button kind="ghost" label="Close" onPress={() => setOpen(false)} /></View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
