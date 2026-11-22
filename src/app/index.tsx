import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GAME_ICONS } from '@/components/game-picker';
import {
  Button,
  Card,
  Empty,
  GradientCard,
  Icon,
  IconBadge,
  IconButton,
  Pill,
  ProgressBar,
  Row,
  Screen,
  Section,
  Txt,
  type IconName,
} from '@/components/ui';
import { Font, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import {
  countNewPages,
  duePages,
  gamePool,
  getStats,
  listSubjects,
  studySecondsToday,
  upcomingReviews,
  type Stats,
  type SubjectSummary,
} from '@/lib/db';
import { ACHIEVEMENTS, levelFor } from '@/lib/game';
import { formatDate, pickForDay, withName } from '@/lib/i18n';
import { todayStr } from '@/lib/srs';

type HomeData = {
  subjects: SubjectSummary[];
  due: number;
  fresh: number;
  playable: number;
  minutesToday: number;
  stats: Stats;
  upcoming: { due: string; n: number }[];
};

export default function Home() {
  const db = useSQLiteContext();
  const { settings, s, updateSettings } = useApp();
  const d = useDirection();
  const c = useTheme();
  const [data, setData] = useState<HomeData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const today = todayStr();
        const [subjects, due, fresh, pool, seconds, stats, upcoming] = await Promise.all([
          listSubjects(db, today),
          duePages(db, today),
          countNewPages(db),
          gamePool(db),
          studySecondsToday(db, today),
          getStats(db, today),
          upcomingReviews(db, today, 7),
        ]);
        if (!alive) return;
        setData({
          subjects,
          due: due.length,
          fresh,
          playable: pool.length,
          minutesToday: Math.floor(seconds / 60),
          stats,
          upcoming,
        });
      })();
      return () => {
        alive = false;
      };
    }, [db]),
  );

  if (!settings.onboarded) return <Redirect href="/welcome" />;

  const today = todayStr();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? s.goodMorning : s.goodEvening;
  const name = settings.name.trim();
  const cheer = withName(pickForDay(s.encouragements, today), name);
  const xp = data?.stats.xp ?? 0;
  const lv = levelFor(xp);
  const minutes = data?.minutesToday ?? 0;
  const maxUpcoming = Math.max(1, ...(data?.upcoming.map((u) => u.n) ?? [1]));

  const action = (opts: {
    icon: IconName;
    tone: 'accent' | 'primary';
    label: string;
    count: number;
    button: string;
    href: '/review' | '/study';
  }) => (
    <Card style={{ flex: 1 }} tone={opts.count ? opts.tone : 'card'}>
      <IconBadge icon={opts.icon} tone={opts.tone} />
      <View>
        <Txt variant="caption" muted>
          {opts.label}
        </Txt>
        <Txt variant="title">{s.partsCount(opts.count)}</Txt>
      </View>
      <Button
        small
        variant={opts.count ? (opts.tone === 'accent' ? 'accent' : 'primary') : 'ghost'}
        title={opts.button}
        disabled={!opts.count}
        onPress={() => router.push(opts.href)}
      />
    </Card>
  );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt muted>{greeting}</Txt>
          <Txt variant="hero" numberOfLines={1}>
            {name || s.appName}
          </Txt>
        </View>
        <IconButton icon="settings-outline" label={s.settings} onPress={() => router.push('/settings')} />
      </Row>

      <Animated.View entering={FadeInDown.duration(400)}>
        <GradientCard>
          <Txt color="#FFFFFF" variant="heading">
            {cheer}
          </Txt>
          <Row style={{ justifyContent: 'space-between' }}>
            <Pill tone="light" icon="star" text={s.level(lv.level)} />
            <Row gap={4}>
              <Icon name="flame" size={16} color="#FFD08A" />
              <Txt color="#FFFFFFDD" variant="caption">
                {data ? s.streakDays(data.stats.streak) : ' '}
              </Txt>
            </Row>
          </Row>
          <View style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt color="#FFFFFFDD" variant="caption">
                {s.todayGoal}
              </Txt>
              <Txt color="#FFFFFFDD" variant="caption">
                {s.minutesOf(minutes, settings.dailyMinutes)}
              </Txt>
            </Row>
            <ProgressBar value={minutes / settings.dailyMinutes} color="#FFFFFF" track="#FFFFFF33" />
          </View>
          <View style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt color="#FFFFFFDD" variant="caption">
                {`${xp} ${s.xp}`}
              </Txt>
              <Txt color="#FFFFFFDD" variant="caption">
                {s.toNextLevel(lv.next - xp)}
              </Txt>
            </Row>
            <ProgressBar value={lv.progress} color="#FFD08A" track="#FFFFFF33" height={6} />
          </View>
        </GradientCard>
      </Animated.View>

      {Platform.OS === 'web' && !settings.reminderPrompted ? (
        <Card tone="accent">
          <Row>
            <IconBadge icon="notifications-outline" tone="accent" size={42} />
            <View style={{ flex: 1 }}>
              <Txt variant="heading">{s.reminderPromptTitle}</Txt>
              <Txt variant="caption" muted>
                {s.reminderPromptBody}
              </Txt>
            </View>
            <IconButton
              icon="close"
              size={34}
              label={s.cancel}
              onPress={() => updateSettings({ reminderPrompted: true })}
            />
          </Row>
          <Button
            small
            variant="accent"
            icon="calendar-outline"
            title={s.reminder}
            onPress={() => {
              updateSettings({ reminderPrompted: true });
              router.push('/settings');
            }}
          />
        </Card>
      ) : null}

      {data && data.due === 0 && data.fresh === 0 && data.subjects.length > 0 ? (
        <Card tone="primary">
          <Row>
            <Icon name="checkmark-done-circle" size={26} color={c.primary} />
            <Txt variant="heading" style={{ flex: 1 }}>
              {s.allDone}
            </Txt>
          </Row>
        </Card>
      ) : null}

      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Row align="stretch">
          {action({
            icon: 'repeat',
            tone: 'accent',
            label: s.reviewsDue,
            count: data?.due ?? 0,
            button: s.review,
            href: '/review',
          })}
          {action({
            icon: 'book-outline',
            tone: 'primary',
            label: s.newToday,
            count: data?.fresh ?? 0,
            button: s.study,
            href: '/study',
          })}
        </Row>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Card tone="sky" onPress={() => router.push('/games')}>
          <Row>
            <IconBadge icon="game-controller-outline" tone="sky" size={48} />
            <View style={{ flex: 1 }}>
              <Txt variant="heading">{s.gamesTitle}</Txt>
              <Txt variant="caption" muted>
                {data && data.playable === 0 ? s.nothingToPlay : s.gamesHint}
              </Txt>
            </View>
            <Icon name={d.rtl ? 'chevron-back' : 'chevron-forward'} color={c.sky} />
          </Row>
        </Card>
      </Animated.View>

      <Section
        title={s.mySubjects}
        action={
          <Button small variant="secondary" icon="add" title={s.newSubject} onPress={() => router.push('/subject/new')} />
        }>
        {data && data.subjects.length === 0 ? <Empty icon="camera-outline" text={s.noSubjects} /> : null}
        {data?.subjects.map((sub) => (
          <Card key={sub.id} onPress={() => router.push(`/subject/${sub.id}`)}>
            <Row>
              <IconBadge icon={GAME_ICONS[sub.game]} tone="primary" size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
                    {sub.title}
                  </Txt>
                  {sub.due > 0 ? <Pill tone="accent" text={`${sub.due} ${s.statusDue}`} /> : null}
                </Row>
                <Txt variant="caption" muted>
                  {s.subjectStats(sub.total, sub.fresh, sub.due)}
                </Txt>
              </View>
            </Row>
            <ProgressBar value={sub.total ? (sub.total - sub.fresh) / sub.total : 0} height={6} />
          </Card>
        ))}
      </Section>

      <Section title={s.upcoming}>
        {data && data.upcoming.length === 0 ? (
          <Txt muted variant="caption">
            {s.noUpcoming}
          </Txt>
        ) : (
          <Card>
            <View style={{ flexDirection: d.row, alignItems: 'flex-end', gap: Spacing.two, height: 120 }}>
              {data?.upcoming.map((u) => (
                <View key={u.due} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: c.text, fontFamily: Font.semibold, fontSize: 13 }}>{u.n}</Text>
                  <View
                    style={{
                      width: '62%',
                      height: Math.max(6, (u.n / maxUpcoming) * 64),
                      backgroundColor: c.primary,
                      borderRadius: 8,
                      opacity: 0.85,
                    }}
                  />
                  <Text style={{ color: c.textSecondary, fontSize: 10, fontFamily: Font.regular }} numberOfLines={1}>
                    {formatDate(u.due, settings.language)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      </Section>

      <Section title={s.achievements}>
        <View style={{ flexDirection: d.row, flexWrap: 'wrap', gap: Spacing.two }}>
          {ACHIEVEMENTS.map((a) => {
            const got = data ? a.test(data.stats) : false;
            return (
              <View
                key={a.id}
                style={{
                  width: '31%',
                  flexGrow: 1,
                  alignItems: 'center',
                  padding: Spacing.three,
                  gap: 6,
                  borderRadius: 16,
                  backgroundColor: got ? c.accentSoft : c.card,
                  borderWidth: 1,
                  borderColor: got ? c.accent : c.border,
                  opacity: got ? 1 : 0.55,
                }}>
                <Icon name={got ? (a.icon as IconName) : 'lock-closed-outline'} size={24} color={got ? c.accent : c.textSecondary} />
                <Text style={{ color: c.text, fontSize: 12, textAlign: 'center', fontFamily: Font.medium }}>
                  {s.achievementNames[a.id]}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}
