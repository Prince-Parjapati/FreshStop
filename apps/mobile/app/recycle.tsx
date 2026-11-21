import { useCallback, useState } from 'react';
import { FlatList } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { formatINR } from '@mandimart/shared';
import { useRepo } from '../src/lib/useRepo';
import { Button, Card, Screen, T } from '../src/ui/kit';
import { useT } from '../src/i18n';
export default function Recycle() {
  const repo = useRepo(); const t = useT(); const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async () => { if (!repo) return; await repo.purgeDeleted(30); setRows(await repo.transactions({ deleted: true, limit: 200 })); }, [repo]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <Screen style={{ paddingTop: 40 }}><Stack.Screen options={{ headerShown: true, title: t('recycle') }} />
      <FlatList data={rows} keyExtractor={(r) => r.id} contentContainerStyle={{ gap: 8 }} ListEmptyComponent={<T muted>Empty. Deleted entries stay here for 30 days.</T>}
        renderItem={({ item: r }) => <Card style={{ gap: 6 }}><T bold>{r.voucher_no} · {r.type} · {formatINR(r.total_paise)}</T><T muted>{r.date} · {r.party_name ?? ''}</T><Button label={t('restore')} onPress={async () => { await repo!.restore(r.id); load(); }} /></Card>} />
    </Screen>
  );
}
