import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FlipInEasyY, ZoomIn } from 'react-native-reanimated';

import { PageView } from '@/components/page-view';
import { useRewards } from '@/components/rewards';
import { Button, Card, Empty, GradientCard, Pill, ProgressBar, Row, Screen, Txt, haptic } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { duePages, recordReview, type PageWithSubject } from '@/lib/db';
import { XP } from '@/lib/game';
import { pickForDay, relativeDay, withName } from '@/lib/i18n';
import { playSound } from '@/lib/sound';
import { afterReview, todayStr, type Grade } from '@/lib/srs';

export default function Review() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const subjectId = subject ? Number(subject) : undefined;
  const db = useSQLiteContext();
  const { s, settings } = useApp();
  const { award, toast } = useRewards();
  const c = useTheme();

  const [queue, setQueue] = useState<PageWithSubject[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ good: 0, hard: 0, again: 0 });
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    duePages(db, todayStr(), subjectId).then(setQueue);
  }, [db, subjectId]);

  const page = queue?.[index];
  const today = todayStr();

  const reveal = () => {
    playSound('flip');
    haptic();
    setRevealed(true);
  };

  const grade = async (g: Grade) => {
    if (!page) return;
    await recordReview(db, page, g, today);
    setTally((t) => ({ ...t, [g]: t[g] + 1 }));
    if (g === 'again') {
      playSound('wrong');
      haptic('error');
      setCombo(0);
      // Forgotten pages come back once more at the end of this session.
      setQueue((q) => (q ? [...q, { ...page, stage: 0 }] : q));
    } else {
      playSound('correct');
      haptic('success');
      const next = g === 'good' ? combo + 1 : 0;
      setCombo(next);
      if (next >= 3 && next % 3 === 0) toast({ icon: '🔥', title: s.combo(next) });
    }
    await award(g === 'good' ? XP.reviewGood : g === 'hard' ? XP.reviewHard : XP.reviewAgain, 'review');
    if (queue && index + 1 >= queue.length && g !== 'again') playSound('complete');
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  if (!queue) return <Screen>{null}</Screen>;

  if (!page) {
    const total = tally.good + tally.hard + tally.again;
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Stack.Screen options={{ title: s.reviewSession }} />
        {total > 0 ? (
          <Animated.View entering={ZoomIn.springify()}>
            <GradientCard style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 64 }}>🏆</Text>
              <Txt variant="title" color="#fff" center>
                {withName(pickForDay(s.praise, today, total), settings.name, settings.language)}
              </Txt>
              <Txt color="#ffffffdd" center>
                {s.reviewDone}
              </Txt>
              <Txt color="#ffffffdd" center variant="caption">
                {s.reviewSummary(tally.good, tally.hard, tally.again)}
              </Txt>
            </GradientCard>
          </Animated.View>
        ) : (
          <Empty icon="🌤️" text={s.nothingToReview} />
        )}
        <Button variant="secondary" icon="🎮" title={s.games} onPress={() => router.replace('/games/cloze')} />
        <Button title={s.backHome} onPress={() => router.back()} />
      </Screen>
    );
  }

  const preview = (g: Grade) => relativeDay(afterReview(page.stage, g, today).due, today, s);
  const hasQuestion = page.question.trim().length > 0;

  return (
    <Screen>
      <Stack.Screen options={{ title: `${s.reviewSession} · ${s.of(index + 1, queue.length)}` }} />
      <ProgressBar value={index / queue.length} color={c.warning} />

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {page.subject_title}
        </Txt>
        <Pill tone="warning" text={page.label} />
      </Row>

      <Animated.View key={`front-${page.id}-${index}`} entering={FlipInEasyY.duration(450)}>
        <Card tone="warning" style={{ minHeight: 180, justifyContent: 'center' }}>
          <Text style={{ fontSize: 34, textAlign: 'center' }}>{hasQuestion ? '❓' : '🧠'}</Text>
          <Txt variant="title" center>
            {hasQuestion ? page.question : s.recallPrompt}
          </Txt>
          {!hasQuestion && !page.keywords.trim() ? (
            <Txt variant="caption" muted center>
              {s.noNotes}
            </Txt>
          ) : null}
        </Card>
      </Animated.View>

      {!revealed ? (
        <Button icon="👀" title={s.reveal} onPress={reveal} />
      ) : (
        <Animated.View entering={FlipInEasyY.duration(450)} style={{ gap: Spacing.four }}>
          {page.keywords.trim() ? (
            <Card tone="primary">
              <Txt variant="caption" muted>
                {s.keywords}
              </Txt>
              <Txt variant="heading">{page.keywords}</Txt>
            </Card>
          ) : null}
          <PageView page={page} height={340} />
          <Txt variant="heading" center>
            {s.howWell}
          </Txt>
          <Row gap={Spacing.two} align="stretch">
            {(
              [
                ['again', 'danger', '😵'],
                ['hard', 'warning', '😅'],
                ['good', 'primary', '😎'],
              ] as const
            ).map(([g, variant, icon]) => (
              <View key={g} style={{ flex: 1, gap: 4 }}>
                <Button variant={variant} icon={icon} title={s[g]} onPress={() => grade(g)} />
                <Txt variant="caption" muted center>
                  {preview(g)}
                </Txt>
              </View>
            ))}
          </Row>
        </Animated.View>
      )}
    </Screen>
  );
}
