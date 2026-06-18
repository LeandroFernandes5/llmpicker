import { Tabs } from 'expo-router';
import { Platform, TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const theme = useTheme();

  const tabBarLabelStyle: TextStyle = {
    fontSize: 12,
    fontWeight: '500',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: Platform.select({ ios: 0.5, android: 0 }),
          height: Platform.select({ ios: 84, android: 64 }),
          paddingBottom: Platform.select({
            ios: 24,
            android: 8,
            web: 'calc(env(safe-area-inset-bottom) + 8px)',
          }),
        },
        tabBarLabelStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarLabel: 'Chats',
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: 'Templates',
          tabBarLabel: 'Templates',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
        }}
      />
    </Tabs>
  );
}
