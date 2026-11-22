import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager } from 'react-native';

import { DEFAULT_SETTINGS, getSettings, saveSettings, type Settings } from '@/lib/db';
import { getStrings, type Strings } from '@/lib/i18n';
import { cancelReminders, scheduleDailyReminder } from '@/lib/reminders';
import { setSoundEnabled } from '@/lib/sound';

type AppContextValue = {
  ready: boolean;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  s: Strings;
  rtl: boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSettings(db)
      .then(setSettings)
      .finally(() => setReady(true));
  }, [db]);

  useEffect(() => {
    setSoundEnabled(settings.sound);
  }, [settings.sound]);

  // Keep the daily reminder in sync with the settings (time, language, name).
  const { onboarded, reminderEnabled, reminderHour, reminderMinute, name, language, gender, profile } = settings;
  useEffect(() => {
    if (!ready || !onboarded) return;
    if (!reminderEnabled) {
      cancelReminders().catch(() => {});
      return;
    }
    const s = getStrings(language, gender, profile);
    scheduleDailyReminder({
      hour: reminderHour,
      minute: reminderMinute,
      title: s.reminderTitle(name.trim()),
      bodies: s.reminders,
    }).catch(() => {});
  }, [ready, onboarded, reminderEnabled, reminderHour, reminderMinute, name, language, gender, profile]);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      await saveSettings(db, patch);
    },
    [db],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings,
      updateSettings,
      s: getStrings(settings.language, settings.gender, settings.profile),
      rtl: settings.language === 'ar',
    }),
    [ready, settings, updateSettings],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/**
 * Layout helpers that follow the chosen language rather than the phone's locale.
 * The app language can differ from the system direction, so we flip relative to
 * whatever direction React Native is already using.
 */
// react-native-web has no `isRTL` field, only getConstants().
const SYSTEM_RTL = Boolean(I18nManager.isRTL ?? I18nManager.getConstants?.().isRTL);

export function useDirection() {
  const { rtl } = useApp();
  const flip = rtl !== SYSTEM_RTL;
  return {
    rtl,
    row: (flip ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    textAlign: (flip ? 'right' : 'left') as 'left' | 'right',
    writingDirection: (rtl ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    alignStart: (flip ? 'flex-end' : 'flex-start') as 'flex-start' | 'flex-end',
    /** Text alignment for content in a given direction, independent of the UI language. */
    alignFor: (dir: 'rtl' | 'ltr') => ((dir === 'rtl') !== SYSTEM_RTL ? 'right' : 'left') as 'left' | 'right',
  };
}
