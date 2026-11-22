import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInRight, ZoomIn } from 'react-native-reanimated';

import { GoalClock, useStudyClock } from '@/components/goal-clock';
import { PageView } from '@/components/page-view';
import { Quiz, type QuizOutcome } from '@/components/quiz';
import { useRewards } from '@/components/rewards';
import {
  Button,
  Card,
  Empty,
  GradientCard,
  Icon,
  Input,
  Pill,
  Row,
  Screen,
  Txt,
  haptic,
  type IconName,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import {
  getPage,
  markStudied,
  nextNewPages,
  updatePageNotes,
  type PageWithSubject,
} from '@/lib/db';
import { XP, makeRound, type SingleRound } from '@/lib/game';
import { pickForDay, withName } from '@/lib/i18n';
import { playSound } from '@/lib/sound';
import { hasVoice, readAloud, stopReading } from '@/lib/speech';
import { todayStr } from '@/lib/srs';
import { detectLanguage } from '@/lib/text';

export default function Study() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const subjectId = subject ? Number(subject) : undefined;
  const db = useSQLiteContext();
  const { s, settings } = useApp();
  const { award } = useRewards();

  const [queue, setQueue] = useState<PageWithSubject[] | null>(null);
  const [index, setIndex] = useState(0);
  const [studied, setStudied] = useState(0);
  const [stopped, setStopped] = useState(false);
  const seconds = useStudyClock(db);

  useEffect(() => {
    let alive = true;
    nextNewPages(db, 300, subjectId).then((list) => {
      if (alive) setQueue(list);
    });
    return () => {
      alive = false;
    };
  }, [db, subjectId]);

  const page = stopped ? undefined : queue?.[index];

  // The user may add text to the current page from its details screen; pick that up on return.
  const currentId = page?.id;
  useFocusEffect(
    useCallback(() => {
      if (!currentId) return;
      getPage(db, currentId).then((fresh) => {
        if (fresh) setQueue((q) => q?.map((p) => (p.id === fresh.id ? fresh : p)) ?? q);
      });
    }, [db, currentId]),
  );

  const finishPage = async (opts: { notes?: { keywords: string; question: string }; correct?: boolean }) => {
    if (!page) return;
    if (opts.notes) await updatePageNotes(db, page.id, opts.notes);
    await markStudied(db, page.id, todayStr());
    haptic('success');
    await award(XP.study + (opts.correct ? XP.testCorrect : 0), 'study');
    setStudied((n) => n + 1);
    if (queue && index + 1 >= queue.length) playSound('complete');
    setIndex((i) => i + 1);
  };

  if (!queue) return <Screen title={s.studySession}>{null}</Screen>;

  // Session finished, stopped, or nothing to do.
  if (!page) {
    return (
      <Screen title={s.studySession} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        {studied > 0 ? (
          <Animated.View entering={ZoomIn.springify()}>
            <GradientCard style={{ alignItems: 'center' }}>
              <Icon name="sparkles" size={56} color="#FFD08A" />
              <Txt variant="title" color="#fff" center>
                {withName(pickForDay(s.praise, todayStr(), studied), settings.name)}
              </Txt>
              <Txt color="#ffffffdd" center>
                {s.studiedParts(studied)}
              </Txt>
              <Pill tone="light" icon="star" text={s.xpGained(studied * XP.study)} />
            </GradientCard>
          </Animated.View>
        ) : (
          <Empty icon="leaf-outline" text={s.nothingToStudy} />
        )}
        <GoalClock seconds={seconds} goal={settings.dailyMinutes * 60} />
        {stopped && queue.length > index ? (
          <Button variant="secondary" icon="play" title={s.study} onPress={() => setStopped(false)} />
        ) : null}
        <Button title={s.backHome} icon="home-outline" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={`${s.studySession} · ${s.of(index + 1, queue.length)}`}>
        <GoalClock seconds={seconds} goal={settings.dailyMinutes * 60} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
            {page.subject_title}
          </Txt>
          <Pill text={page.label} />
        </Row>
        {page.text.trim() ? (
          <TextCard key={`${page.id}-${page.text.length}`} page={page} pool={queue} onDone={(o) => finishPage({ correct: o.verdict === 'correct' })} />
        ) : (
          <NotesCard key={`${page.id}-${page.text.length}`} page={page} onDone={(notes) => finishPage({ notes })} />
        )}
        {studied > 0 || index > 0 ? (
          <Button
            variant="ghost"
            small
            icon="pause-circle-outline"
            title={s.stopHere}
            onPress={() => {
              stopReading();
              setStopped(true);
            }}
          />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

type Phase = 'listen' | 'look' | 'test';

/** A passage: listen to it, take a last look, then a quick timed test. */
function TextCard({
  page,
  pool,
  onDone,
}: {
  page: PageWithSubject;
  pool: PageWithSubject[];
  onDone: (o: QuizOutcome) => void;
}) {
  const { s, settings } = useApp();
  const c = useTheme();
  const [phase, setPhase] = useState<Phase>('listen');
  const [repeat, setRepeat] = useState(0);
  const [listenRun, setListenRun] = useState(0);
  const [noVoice, setNoVoice] = useState(false);
  const [round, setRound] = useState<SingleRound | null>(null);
  const text = page.text.trim();
  const lang = detectLanguage(text);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    if (phase !== 'listen') return;
    let alive = true;
    let stop = () => {};
    hasVoice(lang).then((ok) => {
      if (!alive) return;
      if (!ok) {
        setNoVoice(true);
        setPhase('look');
        return;
      }
      stop = readAloud(text, {
        repeats: settings.listenRepeats,
        onRepeat: (i) => alive && setRepeat(i),
        onDone: () => {
          if (alive) setPhase('look');
        },
      });
    });
    return () => {
      alive = false;
      stop();
    };
  }, [phase, listenRun, lang, text, settings.listenRepeats]);

  const startTest = () => {
    stopReading();
    const game = page.subject_game === 'match' ? 'mix' : page.subject_game;
    const r = makeRound(page, pool, game);
    if (!r) {
      // Too short to test: count it as studied.
      onDone({ verdict: 'correct', firstTry: true });
      return;
    }
    playSound('flip');
    setRound(r);
    setPhase('test');
  };

  const steps: { key: Phase; label: string; icon: IconName }[] = [
    { key: 'listen', label: s.stepListen, icon: 'volume-high-outline' },
    { key: 'look', label: s.stepLook, icon: 'eye-outline' },
    { key: 'test', label: s.stepTest, icon: 'checkmark-circle-outline' },
  ];
  const at = steps.findIndex((x) => x.key === phase);

  return (
    <Animated.View entering={SlideInRight.duration(300)} style={{ gap: Spacing.four }}>
      <Row gap={Spacing.two}>
        {steps.map((st, i) => (
          <View
            key={st.key}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 6,
              borderRadius: 99,
              backgroundColor: i === at ? c.primary : i < at ? c.primarySoft : c.card,
            }}>
            <Icon name={st.icon} size={14} color={i === at ? c.primaryText : c.primary} />
            <Txt variant="caption" color={i === at ? c.primaryText : c.primary}>
              {st.label}
            </Txt>
          </View>
        ))}
      </Row>

      {phase === 'test' && round ? (
        <Quiz round={round} seconds={settings.answerSeconds} onFinish={onDone} successText={s.memorized} />
      ) : (
        <>
          <Card style={{ paddingVertical: Spacing.five }}>
            {phase === 'listen' ? (
              <Animated.View entering={FadeIn} style={{ alignItems: 'center', gap: Spacing.two }}>
                <Icon name="volume-high" size={30} color={c.primary} />
                <Txt variant="caption" muted center>
                  {`${s.listenHint}${repeat ? ` · ${repeat}/${settings.listenRepeats}` : ''}`}
                </Txt>
              </Animated.View>
            ) : (
              <Txt variant="caption" muted center>
                {s.lookHint}
              </Txt>
            )}
            <Txt variant="reading" dir={dir}>
              {text}
            </Txt>
          </Card>
          {noVoice ? (
            <Card tone="warning">
              <Txt variant="caption">{s.noVoice}</Txt>
            </Card>
          ) : null}
          {phase === 'listen' ? (
            <Button variant="ghost" icon="play-skip-forward-outline" title={s.skip} onPress={() => {
              stopReading();
              setPhase('look');
            }} />
          ) : (
            <Animated.View entering={FadeInDown} style={{ gap: Spacing.two }}>
              <Button icon="checkmark-circle-outline" title={s.readyForTest} onPress={startTest} />
              {!noVoice ? (
                <Button
                  variant="ghost"
                  icon="refresh"
                  title={s.listenAgain}
                  onPress={() => {
                    setRepeat(0);
                    setListenRun((n) => n + 1);
                    setPhase('listen');
                  }}
                />
              ) : null}
            </Animated.View>
          )}
        </>
      )}
    </Animated.View>
  );
}

/** A photo or PDF page without text: read it and jot down key words and a question. */
function NotesCard({
  page,
  onDone,
}: {
  page: PageWithSubject;
  onDone: (notes: { keywords: string; question: string }) => Promise<void>;
}) {
  const { s } = useApp();
  const c = useTheme();
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
      <PageView page={page} />
      <Card tone="sky">
        <Row align="flex-start">
          <Icon name="bulb-outline" color={c.sky} />
          <Txt variant="caption" style={{ flex: 1 }}>
            {s.studyHint}
          </Txt>
        </Row>
        <Button
          small
          variant="ghost"
          icon="text-outline"
          title={s.addText}
          onPress={() => router.push(`/page/${page.id}`)}
        />
      </Card>
      <Input label={s.keywords} placeholder={s.keywordsPlaceholder} value={keywords} onChangeText={setKeywords} multiline />
      <Input label={s.question} placeholder={s.questionPlaceholder} value={question} onChangeText={setQuestion} />
      <Button title={s.doneWithPage} icon="checkmark" onPress={done} loading={saving} />
    </Animated.View>
  );
}
