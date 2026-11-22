import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { addXp, getStats, type XpReason } from '@/lib/db';
import { ACHIEVEMENTS, levelFor } from '@/lib/game';
import { playSound } from '@/lib/sound';

type Toast = { id: number; icon: string; title: string; subtitle?: string; big?: boolean };

type RewardsValue = {
  /** Adds points, then announces any level-up or newly unlocked achievement. */
  award: (amount: number, reason: XpReason) => Promise<void>;
  toast: (t: Omit<Toast, 'id'>) => void;
};

const RewardsContext = createContext<RewardsValue | null>(null);

export function RewardsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { s } = useApp();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.big ? 3200 : 1600);
  }, []);

  const award = useCallback(
    async (amount: number, reason: XpReason) => {
      const before = await getStats(db);
      await addXp(db, amount, reason);
      const after = await getStats(db);
      const lvBefore = levelFor(before.xp).level;
      const lvAfter = levelFor(after.xp).level;
      const unlocked = ACHIEVEMENTS.filter((a) => a.test(after) && !a.test(before));
      if (lvAfter > lvBefore) {
        playSound('levelup');
        toast({ icon: '⭐', title: s.levelUp(lvAfter), big: true });
      }
      for (const a of unlocked) {
        if (lvAfter === lvBefore) playSound('levelup');
        toast({ icon: a.icon, title: s.newAchievement, subtitle: s.achievementNames[a.id], big: true });
      }
    },
    [db, s, toast],
  );

  return (
    <RewardsContext.Provider value={{ award, toast }}>
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 56, alignItems: 'center' }]}>
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInUp.springify()}
            exiting={FadeOutUp}
            style={[
              styles.toast,
              t.big && styles.big,
              { backgroundColor: c.card, borderColor: c.primary, shadowColor: '#000' },
            ]}>
            <Animated.Text entering={ZoomIn.delay(120)} style={{ fontSize: t.big ? 34 : 22 }}>
              {t.icon}
            </Animated.Text>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ color: c.text, fontWeight: '800', fontSize: t.big ? 17 : 15 }}>{t.title}</Text>
              {t.subtitle ? <Text style={{ color: c.textSecondary, fontSize: 14 }}>{t.subtitle}</Text> : null}
            </View>
          </Animated.View>
        ))}
      </View>
    </RewardsContext.Provider>
  );
}

export function useRewards(): RewardsValue {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewards must be used inside <RewardsProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    marginBottom: Spacing.two,
    maxWidth: '90%',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  big: { paddingVertical: Spacing.four },
});
