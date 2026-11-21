import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/theme';
import { useT } from '../../src/i18n';

type I = keyof typeof Ionicons.glyphMap;
const icon = (on: I, off: I) => ({ color, focused }: { color: string; focused: boolean }) => <Ionicons name={focused ? on : off} size={24} color={color} />;
export default function TabsLayout() {
  const { c, shadow } = useTheme(); const t = useT(); const ins = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted, tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
      tabBarStyle: { backgroundColor: c.surface, borderTopWidth: 0, height: 62 + ins.bottom, paddingTop: 6, ...shadow, shadowOffset: { width: 0, height: -4 } } }}>
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="parties" options={{ title: t('parties'), tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="entry" options={{ title: t('entry'), tabBarLabel: () => null,
        tabBarButton: (p) => (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('entry')} onPress={p.onPress as any} style={({ pressed }) => ({ top: -18, width: 62, height: 62, borderRadius: 31, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: c.bg, opacity: pressed ? 0.9 : 1, ...shadow, shadowOpacity: 0.25 })}>
              <Ionicons name="add" size={34} color="#fff" />
            </Pressable>
          </View>) }} />
      <Tabs.Screen name="more" options={{ title: t('more'), tabBarIcon: icon('grid', 'grid-outline') }} />
    </Tabs>
  );
}
