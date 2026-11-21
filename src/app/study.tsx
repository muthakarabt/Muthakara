import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInRight, ZoomIn } from 'react-native-reanimated';

import { PageView } from '@/components/page-view';
import { useRewards } from '@/components/rewards';
import { Button, Card, Empty, GradientCard, Input, Pill, ProgressBar, Row, Screen, Txt, haptic } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApp } from '@/lib/app-context';
import {
  addStudySeconds,
  markStudied,
  nextNewPages,
  studiedTodayCount,
  studySecondsToday,
  updatePageNotes,
  type PageWithSubject,
} from '@/lib/db';
import { XP } from '@/lib/game';
import { pickForDay, withName } from '@/lib/i18n';
import { playSound } from '@/lib/sound';
import { todayStr } from '@/lib/srs';

function formatClock(totalSeconds: number): string {
  const sec = Math.abs(Math.round(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Tracks time on screen and saves it to the study log in small chunks. */
function useStudyClock(db: ReturnType<typeof useSQLiteContext>) {
  const [base, setBase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const unsaved = useRef(0);

  useEffect(() => {
    studySecondsToday(db).then(setBase);
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
      unsaved.current += 1;
      if (unsaved.current >= 15) {
        addStudySeconds(db, unsaved.current);
        unsaved.current = 0;
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      if (unsaved.current > 0) addStudySeconds(db, unsaved.current);
      unsaved.current = 0;
    };
  }, [db]);

  return base + elapsed;
}

export default function Study() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const subjectId = subject ? Number(subject) : undefined;
  const db = useSQLiteContext();
  const { s, settings } = useApp();
  const { award } = useRewards();

  const [queue, setQueue] = useState<PageWithSubject[] | null>(null);
  const [index, setIndex] = useState(0);
  const [studied, setStudied] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [extra, setExtra] = useState(0);
  const seconds = useStudyClock(db);
  const goal = settings.dailyMinutes * 60;

  useEffect(() => {
    let alive = true;
    (async () => {
      const done = await studiedTodayCount(db);
      const left = Math.max(0, settings.newPerDay - done) + extra;
      const list = await nextNewPages(db, left, subjectId);
      return { left, list };
    })().then(({ left, list }) => {
      if (!alive) return;
      setLimitReached(left === 0);
      setQueue(list);
      setIndex(0);
    });
    return () => {
      alive = false;
    };
  }, [db, settings.newPerDay, subjectId, extra]);

  const page = queue?.[index];

  const finishPage = async (notes: { keywords: string; question: string }) => {
    if (!page) return;
    await updatePageNotes(db, page.id, notes);
    await markStudied(db, page.id, todayStr());
    haptic('success');
    playSound('correct');
    await award(XP.study, 'study');
    setStudied((n) => n + 1);
    if (queue && index + 1 >= queue.length) playSound('complete');
    setIndex((i) => i + 1);
  };

  const remaining = goal - seconds;
  const header = (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="caption" muted>
          {remaining > 0 ? s.timeLeft : s.overtime}
        </Txt>
        <Txt variant="heading">⏱️ {formatClock(remaining > 0 ? remaining : seconds - goal)}</Txt>
      </Row>
      <ProgressBar value={seconds / goal} />
    </Card>
  );

  if (!queue) return <Screen>{null}</Screen>;

  // Session finished (or nothing to do).
  if (!page) {
    const name = settings.name;
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Stack.Screen options={{ title: s.studySession }} />
        {studied > 0 ? (
          <Animated.View entering={ZoomIn.springify()}>
            <GradientCard style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 64 }}>🎉</Text>
              <Txt variant="title" color="#fff" center>
                {withName(pickForDay(s.praise, todayStr(), studied), name, s)}
              </Txt>
              <Txt color="#ffffffdd" center>
                {s.studiedPages(studied)}
              </Txt>
              <Pill text={s.xpGained(studied * XP.study)} />
            </GradientCard>
          </Animated.View>
        ) : (
          <Empty icon={limitReached ? '🌙' : '📭'} text={limitReached ? s.dailyLimitReached : s.nothingToStudy} />
        )}
        {header}
        {limitReached || studied > 0 ? (
          <Button variant="secondary" icon="➕" title={s.studyMore} onPress={() => setExtra((n) => n + 1)} />
        ) : null}
        <Button title={s.backHome} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Stack.Screen options={{ title: `${s.studySession} · ${s.of(index + 1, queue.length)}` }} />
        {header}
        <StudyCard key={page.id} page={page} onDone={finishPage} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function StudyCard({
  page,
  onDone,
}: {
  page: PageWithSubject;
  onDone: (notes: { keywords: string; question: string }) => Promise<void>;
}) {
  const { s } = useApp();
  const [keywords, setKeywords] = useState(page.keywords);
  const [question, setQuestion] = useState(page.question);
  const [saving, setSaving] = useState(false);

  const done = async () => {
    setSaving(true);
    try {
      await onDone({ keywords: keywords.trim(), question: question.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Animated.View entering={SlideInRight.duration(300)} style={{ gap: Spacing.four }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
          {page.subject_title}
        </Txt>
        <Pill text={page.label} />
      </Row>
      <PageView page={page} />
      <Animated.View entering={FadeIn.delay(200)}>
        <Txt variant="caption" muted>
          💡 {s.studyHint}
        </Txt>
      </Animated.View>
      <Input
        label={s.keywords}
        placeholder={s.keywordsPlaceholder}
        value={keywords}
        onChangeText={setKeywords}
        multiline
      />
      <Input label={s.question} placeholder={s.questionPlaceholder} value={question} onChangeText={setQuestion} />
      <View>
        <Button title={s.doneWithPage} onPress={done} loading={saving} />
      </View>
    </Animated.View>
  );
}
