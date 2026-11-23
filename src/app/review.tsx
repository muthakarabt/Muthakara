import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FlipInEasyY, ZoomIn } from 'react-native-reanimated';

import { GoalClock, useStudyClock } from '@/components/goal-clock';
import { PageView } from '@/components/page-view';
import { Quiz, gradeFor, type QuizOutcome } from '@/components/quiz';
import { useRewards } from '@/components/rewards';
import {
  Button,
  Card,
  Empty,
  GradientCard,
  Icon,
  Pill,
  ProgressBar,
  Row,
  Screen,
  Txt,
  haptic,
  type IconName,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { duePages, recordReview, type PageWithSubject } from '@/lib/db';
import { XP, makeRound, type SingleRound } from '@/lib/game';
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
  const seconds = useStudyClock(db);

  const [queue, setQueue] = useState<PageWithSubject[] | null>(null);
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState({ good: 0, hard: 0, again: 0 });
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    let alive = true;
    duePages(db, todayStr(), subjectId).then((list) => {
      if (alive) setQueue(list);
    });
    return () => {
      alive = false;
    };
  }, [db, subjectId]);

  const page = queue?.[index];
  const today = todayStr();

  const grade = useSingleFlight(async (g: Grade) => {
    if (!page) return;
    await recordReview(db, page, g, today);
    setTally((t) => ({ ...t, [g]: t[g] + 1 }));
    if (g === 'again') {
      setCombo(0);
      // Forgotten parts come back once more at the end of this session.
      setQueue((q) => (q ? [...q, { ...page, stage: 0 }] : q));
    } else {
      const next = g === 'good' ? combo + 1 : 0;
      setCombo(next);
      if (next >= 3 && next % 3 === 0) toast({ icon: 'flame', title: s.combo(next) });
    }
    await award(g === 'good' ? XP.reviewGood : g === 'hard' ? XP.reviewHard : XP.reviewAgain, 'review');
    if (queue && index + 1 >= queue.length && g !== 'again') playSound('complete');
    setIndex((i) => i + 1);
  });

  if (!queue) return <Screen title={s.reviewSession}>{null}</Screen>;

  if (!page) {
    const total = tally.good + tally.hard + tally.again;
    return (
      <Screen title={s.reviewSession} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        {total > 0 ? (
          <Animated.View entering={ZoomIn.springify()}>
            <GradientCard style={{ alignItems: 'center' }}>
              <Icon name="trophy" size={56} color="#FFD08A" />
              <Txt variant="title" color="#fff" center>
                {withName(pickForDay(s.praise, today, total), settings.name)}
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
          <Empty icon="sunny-outline" tone="accent" text={s.nothingToReview} />
        )}
        <GoalClock seconds={seconds} goal={settings.dailyMinutes * 60} />
        <Button variant="secondary" icon="game-controller-outline" title={s.play} onPress={() => router.replace('/games')} />
        <Button title={s.backHome} icon="home-outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title={`${s.reviewSession} · ${s.of(index + 1, queue.length)}`}>
      <ProgressBar value={index / queue.length} color={c.accent} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {page.subject_title}
        </Txt>
        <Pill tone="accent" text={page.label} />
      </Row>
      {page.text.trim() ? (
        <TextReview key={`${page.id}-${index}`} page={page} pool={queue} onGrade={grade} />
      ) : (
        <FlipReview key={`${page.id}-${index}`} page={page} onGrade={grade} />
      )}
    </Screen>
  );
}

/** Passages are reviewed with a quick test; the result sets when it comes back. */
function TextReview({
  page,
  pool,
  onGrade,
}: {
  page: PageWithSubject;
  pool: PageWithSubject[];
  onGrade: (g: Grade) => void;
}) {
  const { settings } = useApp();
  const [round] = useState<SingleRound | null>(() =>
    makeRound(page, pool, page.subject_game === 'match' ? 'mix' : page.subject_game),
  );
  if (!round) return <FlipReview page={page} onGrade={onGrade} />;
  return (
    <Quiz
      round={round}
      seconds={settings.answerSeconds}
      onFinish={(o: QuizOutcome) => onGrade(gradeFor(o))}
    />
  );
}

/** Photos and PDF pages: recall first, then reveal and say how it went. */
function FlipReview({ page, onGrade }: { page: PageWithSubject; onGrade: (g: Grade) => void }) {
  const { s } = useApp();
  const c = useTheme();
  const [revealed, setRevealed] = useState(false);
  const today = todayStr();
  const preview = (g: Grade) => relativeDay(afterReview(page.stage, g, today).due, today, s);
  const hasQuestion = page.question.trim().length > 0;

  const choose = (g: Grade) => {
    if (g === 'again') {
      playSound('wrong');
      haptic('error');
    } else {
      playSound(g === 'good' ? 'correct' : 'close');
      haptic('success');
    }
    onGrade(g);
  };

  return (
    <View style={{ gap: Spacing.four }}>
      <Animated.View entering={FlipInEasyY.duration(450)}>
        <Card tone="accent" style={{ minHeight: 170, justifyContent: 'center', alignItems: 'center' }}>
          <Icon name={hasQuestion ? 'help-circle-outline' : 'bulb-outline'} size={34} color={c.accent} />
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
        <Button
          icon="eye-outline"
          title={s.reveal}
          onPress={() => {
            playSound('flip');
            haptic();
            setRevealed(true);
          }}
        />
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
          {page.uri ? <PageView page={page} height={340} /> : null}
          <Txt variant="heading" center>
            {s.howWell}
          </Txt>
          <Row gap={Spacing.two} align="stretch">
            {(
              [
                ['again', 'danger', 'refresh'],
                ['hard', 'warning', 'ellipse-outline'],
                ['good', 'primary', 'checkmark'],
              ] as const
            ).map(([g, variant, icon]) => (
              <View key={g} style={{ flex: 1, gap: 4 }}>
                <Button variant={variant} icon={icon as IconName} title={s[g]} onPress={() => choose(g)} />
                <Txt variant="caption" muted center>
                  {preview(g)}
                </Txt>
              </View>
            ))}
          </Row>
        </Animated.View>
      )}
    </View>
  );
}
