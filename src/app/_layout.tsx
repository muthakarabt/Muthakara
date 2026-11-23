import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, useColorScheme } from 'react-native';

import { RewardsProvider } from '@/components/rewards';
import { Backdrop } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { AppProvider, useApp } from '@/lib/app-context';
import { DATABASE_NAME, migrate } from '@/lib/db';
import { useSingleTab } from '@/lib/single-tab';

function AppStack({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useApp();
  const scheme = useColorScheme();
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  if (!ready || !fontsReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Backdrop />
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        // Each screen draws its own header on top of the coloured backdrop.
        headerShown: false,
        contentStyle: { backgroundColor: c.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [loaded, error] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
    ...Ionicons.font,
  });
  const tabReady = useSingleTab();
  if (!tabReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.background, card: c.cardSolid } }}>
      <StatusBar style="auto" />
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
        <AppProvider>
          <RewardsProvider>
            {/* If the font fails to load we still open the app with the system font. */}
            <AppStack fontsReady={loaded || !!error} />
          </RewardsProvider>
        </AppProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
