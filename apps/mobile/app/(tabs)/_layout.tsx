import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '../../src/ui/theme';
import { useT } from '../../src/i18n';
const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
export default function TabsLayout() {
  const { c } = useTheme(); const t = useT();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.primary, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 60 } }}>
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="entry" options={{ title: t('entry'), tabBarIcon: icon('➕') }} />
      <Tabs.Screen name="parties" options={{ title: t('parties'), tabBarIcon: icon('👥') }} />
      <Tabs.Screen name="more" options={{ title: t('more'), tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
