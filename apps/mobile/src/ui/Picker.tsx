import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from './theme';
import { Button } from './kit';

export interface PickOption { id: string; title: string; sub?: string; right?: string }
/** Searchable full-screen picker (party / item). Shows a selector button; onAdd renders a "+ Add new" row. */
export function Picker({ label, placeholder, value, options, onSelect, onAdd, addLabel = '+ Add new' }:
  { label: string; placeholder: string; value?: string; options: PickOption[]; onSelect: (o: PickOption) => void; onAdd?: (q: string) => void; addLabel?: string }) {
  const { c, radius } = useTheme();
  const [open, setOpen] = useState(false); const [q, setQ] = useState('');
  const sel = options.find((o) => o.id === value);
  const f = options.filter((o) => !q.trim() || (o.title + ' ' + (o.sub ?? '')).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { setQ(''); setOpen(true); }}
        style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 12, justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }}>
        <Text numberOfLines={1} style={{ flex: 1, color: sel ? c.text : c.muted, fontSize: 16 }}>{sel ? sel.title : placeholder}</Text><Text style={{ color: c.muted }}>▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: c.bg, padding: 16, paddingTop: 48, gap: 10 }}>
          <TextInput autoFocus placeholder="Search…" placeholderTextColor={c.muted} value={q} onChangeText={setQ} accessibilityLabel="Search"
            style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, color: c.text, paddingHorizontal: 12, fontSize: 16 }} />
          <FlatList data={f} keyExtractor={(o) => o.id} keyboardShouldPersistTaps="handled"
            ListHeaderComponent={onAdd ? <Pressable onPress={() => { setOpen(false); onAdd(q.trim()); }} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.primary, fontWeight: '700' }}>{addLabel}{q.trim() ? ` “${q.trim()}”` : ''}</Text></Pressable> : null}
            ListEmptyComponent={<Text style={{ color: c.muted, padding: 12 }}>No matches</Text>}
            renderItem={({ item }) => (
              <Pressable accessibilityRole="button" onPress={() => { onSelect(item); setOpen(false); }} style={{ minHeight: 52, justifyContent: 'center', borderBottomWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}><Text style={{ color: c.text, fontSize: 16, fontWeight: item.id === value ? '700' : '400' }}>{item.title}</Text>{!!item.sub && <Text style={{ color: c.muted, fontSize: 12 }}>{item.sub}</Text>}</View>
                {!!item.right && <Text style={{ color: c.muted }}>{item.right}</Text>}
              </Pressable>)} />
          <Button kind="ghost" label="Close" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}
