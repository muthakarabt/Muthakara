import { Redirect, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Empty, GradientCard, Pill, ProgressBar, Row, Screen, Section, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import {
  countNewPages,
  duePages,
  getStats,
  listSubjects,
  studiedTodayCount,
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
  newAvailable: number;
  newLeftToday: number;
  minutesToday: number;
  stats: Stats;
  upcoming: { due: string; n: number }[];
};

export default function Home() {
  const db = useSQLiteContext();
  const { settings, s } = useApp();
  const d = useDirection();
  const c = useTheme();
  const [data, setData] = useState<HomeData | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const today = todayStr();
        const [subjects, due, newAvailable, studiedToday, seconds, stats, upcoming] = await Promise.all([
          listSubjects(db, today),
          duePages(db, today),
          countNewPages(db),
          studiedTodayCount(db, today),
          studySecondsToday(db, today),
          getStats(db, today),
          upcomingReviews(db, today, 7),
        ]);
        if (!alive) return;
        setData({
          subjects,
          due: due.length,
          newAvailable,
          newLeftToday: Math.min(newAvailable, Math.max(0, settings.newPerDay - studiedToday)),
          minutesToday: Math.floor(seconds / 60),
          stats,
          upcoming,
        });
      })();
      return () => {
        alive = false;
      };
    }, [db, settings.newPerDay]),
  );

  if (!settings.onboarded) return <Redirect href="/welcome" />;

  const today = todayStr();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? s.goodMorning : s.goodEvening;
  const name = settings.name.trim();
  const cheer = withName(pickForDay(s.encouragements, today), name, settings.language);
  const lv = levelFor(data?.stats.xp ?? 0);
  const minutes = data?.minutesToday ?? 0;
  const maxUpcoming = Math.max(1, ...(data?.upcoming.map((u) => u.n) ?? [1]));

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt muted>{greeting}</Txt>
          <Txt variant="hero">{name ? `${name} 👋` : s.appName}</Txt>
        </View>
        <Pressable
          accessibilityLabel={s.settings}
          onPress={() => router.push('/settings')}
          style={({ pressed }) => ({
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: c.card,
            borderColor: c.border,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}>
          <Text style={{ fontSize: 22 }}>⚙️</Text>
        </Pressable>
      </Row>

      <Animated.View entering={FadeInDown.duration(400)}>
        <GradientCard>
          <Txt color="#FFFFFF" variant="heading">
            {cheer}
          </Txt>
          <Row style={{ justifyContent: 'space-between' }}>
            <Pill text={`⭐ ${s.level(lv.level)}`} />
            <Txt color="#FFFFFFCC" variant="caption">
              {data ? s.streakDays(data.stats.streak) : ' '}
            </Txt>
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
                {`${data?.stats.xp ?? 0} ${s.xp}`}
              </Txt>
              <Txt color="#FFFFFFDD" variant="caption">
                {s.toNextLevel(lv.next - (data?.stats.xp ?? 0))}
              </Txt>
            </Row>
            <ProgressBar value={lv.progress} color="#FFD166" track="#FFFFFF33" height={6} />
          </View>
        </GradientCard>
      </Animated.View>

      {data && data.due === 0 && data.newLeftToday === 0 && data.subjects.length > 0 ? (
        <Card tone="primary">
          <Txt variant="heading" center>
            {s.allDone}
          </Txt>
        </Card>
      ) : null}

      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <Row align="stretch">
          <Card style={{ flex: 1 }} tone={data?.due ? 'warning' : 'card'}>
            <Text style={{ fontSize: 28 }}>🔁</Text>
            <Txt variant="caption" muted>
              {s.reviewsDue}
            </Txt>
            <Txt variant="title">{s.pagesCount(data?.due ?? 0)}</Txt>
            <Button
              small
              variant={data?.due ? 'warning' : 'ghost'}
              title={s.startReview}
              disabled={!data?.due}
              onPress={() => router.push('/review')}
            />
          </Card>
          <Card style={{ flex: 1 }} tone={data?.newLeftToday ? 'primary' : 'card'}>
            <Text style={{ fontSize: 28 }}>📖</Text>
            <Txt variant="caption" muted>
              {s.newToday}
            </Txt>
            <Txt variant="title">{s.pagesCount(data?.newLeftToday ?? 0)}</Txt>
            <Button
              small
              variant={data?.newLeftToday ? 'primary' : 'ghost'}
              title={s.startStudy}
              disabled={!data?.newAvailable}
              onPress={() => router.push('/study')}
            />
          </Card>
        </Row>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Section title={`🎮 ${s.games}`}>
          <Txt muted variant="caption">
            {s.gamesHint}
          </Txt>
          <Row align="stretch">
            <Card style={{ flex: 1 }} onPress={() => router.push('/games/cloze')}>
              <Text style={{ fontSize: 30 }}>🧩</Text>
              <Txt variant="heading">{s.clozeTitle}</Txt>
              <Txt variant="caption" muted>
                {s.clozeDesc}
              </Txt>
            </Card>
            <Card style={{ flex: 1 }} onPress={() => router.push('/games/match')}>
              <Text style={{ fontSize: 30 }}>🔗</Text>
              <Txt variant="heading">{s.matchTitle}</Txt>
              <Txt variant="caption" muted>
                {s.matchDesc}
              </Txt>
            </Card>
          </Row>
        </Section>
      </Animated.View>

      <Section
        title={`📚 ${s.mySubjects}`}
        action={<Button small variant="secondary" icon="＋" title={s.newSubject} onPress={() => router.push('/subject/new')} />}>
        {data && data.subjects.length === 0 ? <Empty icon="📷" text={s.noSubjects} /> : null}
        {data?.subjects.map((sub) => (
          <Card key={sub.id} onPress={() => router.push(`/subject/${sub.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
                {sub.title}
              </Txt>
              {sub.due > 0 ? <Pill tone="warning" text={`${sub.due} ${s.statusDue}`} /> : null}
            </Row>
            <Txt variant="caption" muted>
              {s.subjectStats(sub.total, sub.fresh, sub.due)}
            </Txt>
            <ProgressBar value={sub.total ? (sub.total - sub.fresh) / sub.total : 0} height={6} />
          </Card>
        ))}
      </Section>

      <Section title={`🗓️ ${s.upcoming}`}>
        {data && data.upcoming.length === 0 ? (
          <Txt muted variant="caption">
            {s.noUpcoming}
          </Txt>
        ) : (
          <Card>
            <View style={{ flexDirection: d.row, alignItems: 'flex-end', gap: Spacing.two, height: 110 }}>
              {data?.upcoming.map((u) => (
                <View key={u.due} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: c.text, fontWeight: '700', fontSize: 13 }}>{u.n}</Text>
                  <View
                    style={{
                      width: '70%',
                      height: Math.max(6, (u.n / maxUpcoming) * 60),
                      backgroundColor: c.primary,
                      borderRadius: 6,
                    }}
                  />
                  <Text style={{ color: c.textSecondary, fontSize: 10 }} numberOfLines={1}>
                    {formatDate(u.due, settings.language)}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      </Section>

      <Section title={`🏅 ${s.achievements}`}>
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
                  gap: 4,
                  borderRadius: 14,
                  backgroundColor: got ? c.primarySoft : c.card,
                  borderWidth: 1,
                  borderColor: got ? c.primary : c.border,
                  opacity: got ? 1 : 0.45,
                }}>
                <Text style={{ fontSize: 26 }}>{got ? a.icon : '🔒'}</Text>
                <Text style={{ color: c.text, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>
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
