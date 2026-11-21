import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTheme } from '../../src/ui/theme';
const icon = (e: string) => () => <Text style={{ fontSize: 20 }}>{e}</Text>;
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.primary, tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 60 } }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="entry" options={{ title: 'New Entry', tabBarIcon: icon('➕') }} />
      <Tabs.Screen name="parties" options={{ title: 'Parties', tabBarIcon: icon('👥') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
