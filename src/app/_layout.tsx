import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { Stack } from 'expo-router';

import { migrateDbIfNeeded } from '@/db/schema';
import { useApiKeysStore } from '@/store/api-keys';
import { useConversationsStore } from '@/store/conversations';
import { useTemplatesStore } from '@/store/templates';

function BootstrapStores() {
  const db = useSQLiteContext();
  const initKeys = useApiKeysStore((s) => s.init);
  const initConvos = useConversationsStore((s) => s.init);
  const initTemplates = useTemplatesStore((s) => s.init);

  useEffect(() => {
    initKeys();
    initConvos(db);
    initTemplates(db);
  }, [db, initKeys, initConvos, initTemplates]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName="llmpicker.db" onInit={migrateDbIfNeeded}>
        <BootstrapStores />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[id]"
            options={{ headerShown: false }}
          />
        </Stack>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
