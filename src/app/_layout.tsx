import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, useColorScheme } from 'react-native';

import { RewardsProvider } from '@/components/rewards';
import { Colors } from '@/constants/theme';
import { AppProvider, useApp } from '@/lib/app-context';
import { DATABASE_NAME, migrate } from '@/lib/db';

function AppStack() {
  const { ready } = useApp();
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.primary,
        headerTitleStyle: { color: c.text, fontWeight: '700' },
        contentStyle: { backgroundColor: c.background },
        headerBackButtonDisplayMode: 'minimal',
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="subject/new" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.background, card: c.background } }}>
      <StatusBar style="auto" />
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
        <AppProvider>
          <RewardsProvider>
            <AppStack />
          </RewardsProvider>
        </AppProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
