import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { Button, Card, Screen, T } from '../src/ui/kit';
import { useT } from '../src/i18n';
export default function Recycle() {
  const repo = useRepo(); const t = useT(); const [rows, setRows] = useState<any[]>([]); const [pty, setPty] = useState<any[]>([]); const [its, setIts] = useState<any[]>([]);
  const load = useCallback(async () => { if (!repo) return; await repo.purgeDeleted(30); setRows(await repo.transactions({ deleted: true, limit: 200 })); setPty(await repo.listAccounts({ deleted: true })); setIts(await repo.listItems('', true)); }, [repo]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: t('recycle') }} />
      <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ gap: 8 }} ListHeaderComponent={<>{pty.map((p) => <Card key={p.id} style={{ gap: 6, marginBottom: 8 }}><T bold>Party: {p.name}</T><Button label={t('restore')} onPress={async () => { await repo!.restoreAccount(p.id); load(); }} /></Card>)}{its.map((i) => <Card key={i.id} style={{ gap: 6, marginBottom: 8 }}><T bold>Item: {i.name}</T><Button label={t('restore')} onPress={async () => { await repo!.restoreItem(i.id); load(); }} /></Card>)}</>} ListEmptyComponent={!pty.length && !its.length ? <T muted>Empty. Deleted entries, parties and items stay here for 30 days.</T> : null}
        renderItem={({ item: r }) => <Card style={{ gap: 6 }}><T bold>{r.voucher_no} · {r.type} · {formatINR(r.total_paise)}</T><T muted>{r.date} · {r.party_name ?? ''}</T><Button label={t('restore')} onPress={async () => { await repo!.restore(r.id); load(); }} /></Card>} />
    </Screen>
  );
}
