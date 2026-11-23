import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useRewards } from '@/components/rewards';
import { Button, Card, Icon, ProgressBar, Row, Screen, Section, Txt, haptic } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { addPages, type NewPage } from '@/lib/db';
import { takePendingFile } from '@/lib/import-queue';
import { persistFile } from '@/lib/media';
import { useOcr } from '@/lib/ocr';
import { organize, type FoundQuestion, type Lesson } from '@/lib/organize';
import { detectLanguage } from '@/lib/text';

type Choice = { include: boolean; important: boolean };
type State =
  | { step: 'reading'; progress: number; page: number }
  | { step: 'done'; lessons: Lesson[]; questions: FoundQuestion[]; read: number; total: number }
  | { step: 'failed'; reason: 'unreadable' | 'too-big' };

const MAX_READ_PAGES = 150;

/**
 * A whole PDF: reads every page, splits it into lessons (by headings, or by page)
 * and pulls out question/answer pairs, then asks what the teacher stressed.
 * `?subject=ID`; the file comes from the subject screen through the import queue.
 */
export default function FileScreen() {
  const { subject } = useLocalSearchParams<{ subject: string }>();
  const subjectId = Number(subject);
  const db = useSQLiteContext();
  const { s } = useApp();
  const { toast } = useRewards();
  const c = useTheme();
  const engine = useOcr();
  const [file] = useState(() => takePendingFile(subjectId));
  const [progress, setState] = useState<State>({ step: 'reading', progress: 0, page: 0 });
  const [lessonPicks, setLessonPicks] = useState<Choice[]>([]);
  const [questionPicks, setQuestionPicks] = useState<Choice[]>([]);
  const [saving, setSaving] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const { status, readPdf } = engine;
  useEffect(() => {
    if (!file || status !== 'ready') return;
    let alive = true;
    readPdf(file.uri, (progress, page) => {
      if (alive) setState({ step: 'reading', progress, page });
    })
      .then(({ pages, total }) => {
        if (!alive) return;
        setPageCount(total);
        const { lessons, questions } = organize(pages.slice(0, MAX_READ_PAGES), s.pageN);
        if (lessons.length === 0 && questions.length === 0) {
          setState({ step: 'failed', reason: 'unreadable' });
          return;
        }
        setLessonPicks(lessons.map(() => ({ include: true, important: false })));
        setQuestionPicks(questions.map(() => ({ include: true, important: false })));
        setState({ step: 'done', lessons, questions, read: pages.length, total });
      })
      .catch((e: Error) => {
        if (alive) setState({ step: 'failed', reason: e.message === 'too-big' ? 'too-big' : 'unreadable' });
      });
    return () => {
      alive = false;
    };
  }, [file, status, readPdf, s.pageN]);

  // The reading engine itself could not start (e.g. the phone is offline).
  const state: State =
    status === 'failed' && progress.step === 'reading' ? { step: 'failed', reason: 'unreadable' } : progress;

  const saveOrganized = async () => {
    if (state.step !== 'done') return;
    setSaving(true);
    try {
      const pages: NewPage[] = [];
      state.questions.forEach((q, i) => {
        const pick = questionPicks[i];
        if (!pick?.include) return;
        pages.push({
          kind: 'text',
          uri: '',
          label: q.lesson ? `${s.questionCard} · ${q.lesson}` : s.questionCard,
          question: q.question,
          text: q.answer,
          qa: true,
          important: pick.important,
        });
      });
      state.lessons.forEach((l, i) => {
        const pick = lessonPicks[i];
        if (!pick?.include) return;
        l.parts.forEach((part, j) => {
          pages.push({
            kind: 'text',
            uri: '',
            label: s.partOf(l.title, j + 1, l.parts.length),
            text: part,
            important: pick.important,
          });
        });
      });
      // Stressed parts first, so a short session covers them.
      pages.sort((a, b) => Number(!!b.important) - Number(!!a.important));
      await addPages(db, subjectId, pages);
      haptic('success');
      toast({ icon: 'checkmark-circle', title: s.partsCount(pages.length) });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  /** The old way: each page becomes a card to look at, with no text. */
  const saveAsPages = async () => {
    if (!file) return;
    setSaving(true);
    try {
      const uri = await persistFile(file.uri, 'pdf');
      const n = Math.min(500, Math.max(1, pageCount || (state.step === 'done' ? state.total : 1)));
      const list: NewPage[] = [];
      for (let i = 1; i <= n; i++) list.push({ kind: 'pdf', uri, label: s.pageN(i) });
      await addPages(db, subjectId, list);
      toast({ icon: 'document-text-outline', title: s.pagesCount(list.length) });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!file) {
    return (
      <Screen title={s.fileTitle}>
        <Txt muted center>
          {s.noPages}
        </Txt>
      </Screen>
    );
  }

  const toggle = (which: 'lesson' | 'question', i: number, key: keyof Choice) => {
    haptic();
    const set = which === 'lesson' ? setLessonPicks : setQuestionPicks;
    set((picks) => picks.map((p, j) => (j === i ? { ...p, [key]: !p[key] } : p)));
  };

  const row = (which: 'lesson' | 'question', i: number, title: string, sub: string) => {
    const pick = (which === 'lesson' ? lessonPicks : questionPicks)[i];
    if (!pick) return null;
    const dir = detectLanguage(title + ' ' + sub) === 'ar' ? 'rtl' : 'ltr';
    return (
      <Card key={`${which}${i}`} style={{ padding: Spacing.three, opacity: pick.include ? 1 : 0.55 }}>
        <Row align="flex-start">
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: pick.include }}
            accessibilityLabel={title}
            onPress={() => toggle(which, i, 'include')}
            hitSlop={8}>
            <Icon name={pick.include ? 'checkbox' : 'square-outline'} color={c.primary} />
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt bold dir={dir} numberOfLines={3}>
              {title}
            </Txt>
            <Txt variant="caption" muted dir={dir} numberOfLines={2}>
              {sub}
            </Txt>
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: pick.important }}
            accessibilityLabel={s.importantLabel}
            onPress={() => toggle(which, i, 'important')}
            hitSlop={8}>
            <Icon name={pick.important ? 'star' : 'star-outline'} size={26} color={c.accent} />
          </Pressable>
        </Row>
      </Card>
    );
  };

  const chosen =
    state.step === 'done'
      ? state.lessons.reduce((n, l, i) => n + (lessonPicks[i]?.include ? l.parts.length : 0), 0) +
        questionPicks.filter((p) => p.include).length
      : 0;

  return (
    <Screen title={s.fileTitle}>
      {engine.element}
      <Row>
        <Icon name="document-text-outline" color={c.primary} />
        <Txt bold numberOfLines={1} style={{ flex: 1 }}>
          {file.name}
        </Txt>
      </Row>

      {state.step === 'reading' ? (
        <Card>
          <Row>
            <ActivityIndicator color={c.primary} />
            <Txt style={{ flex: 1 }}>{state.page > 0 ? s.readingFilePage(state.page) : s.readingFile}</Txt>
          </Row>
          <ProgressBar value={state.progress} height={6} />
          <Txt variant="caption" muted>
            {s.fileSlowHint}
          </Txt>
        </Card>
      ) : null}

      {state.step === 'failed' ? (
        <>
          <Card tone="warning">
            <Row align="flex-start">
              <Icon name="information-circle-outline" color={c.warning} />
              <Txt variant="caption" style={{ flex: 1 }}>
                {state.reason === 'too-big' ? s.fileTooBig : s.fileReadFailed}
              </Txt>
            </Row>
          </Card>
          {state.reason !== 'too-big' ? (
            <Button icon="document-outline" title={s.saveAsPages} onPress={saveAsPages} loading={saving} />
          ) : null}
        </>
      ) : null}

      {state.step === 'done' ? (
        <Animated.View entering={FadeInDown} style={{ gap: Spacing.four }}>
          <Card tone="primary">
            <Txt variant="heading">
              {s.fileOrganized(s.lessonsCount(state.lessons.length), s.questionsCount(state.questions.length))}
            </Txt>
            {state.read < state.total ? (
              <Txt variant="caption" muted>
                {s.firstPagesOnly(state.read, state.total)}
              </Txt>
            ) : null}
          </Card>

          <Card tone="accent">
            <Row align="flex-start">
              <Icon name="star" color={c.accent} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="heading">{s.teacherAsk}</Txt>
                <Txt variant="caption" muted>
                  {s.teacherAskHint}
                </Txt>
              </View>
            </Row>
          </Card>

          {state.questions.length > 0 ? (
            <Section title={s.questionsTitle}>
              <View style={{ gap: Spacing.two }}>
                {state.questions.map((q, i) => row('question', i, q.question, q.answer))}
              </View>
            </Section>
          ) : null}

          {state.lessons.length > 0 ? (
            <Section title={s.lessonsTitle}>
              <View style={{ gap: Spacing.two }}>
                {state.lessons.map((l, i) => row('lesson', i, l.title, `${s.partsCount(l.parts.length)} · ${l.text}`))}
              </View>
            </Section>
          ) : null}

          <Button
            icon="checkmark"
            title={`${s.addToSubject} · ${s.partsCount(chosen)}`}
            onPress={saveOrganized}
            loading={saving}
            disabled={chosen === 0}
          />
          <Button variant="ghost" icon="document-outline" title={s.saveAsPages} onPress={saveAsPages} disabled={saving} />
        </Animated.View>
      ) : null}
    </Screen>
  );
}
