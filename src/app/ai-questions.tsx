import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useRewards } from '@/components/rewards';
import { Button, Card, Icon, ProgressBar, Row, Screen, Txt, haptic } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AiError, generateQuestions, type AiQuestion } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { addPages, listPages, type Page } from '@/lib/db';
import { detectLanguage } from '@/lib/text';

type Item = AiQuestion & { include: boolean; important: boolean };
type State =
  | { step: 'intro' }
  | { step: 'working'; done: number; total: number }
  | { step: 'done' }
  | { step: 'error'; message: string };

/** Groups the subject's passages into chunks of about `size` characters, keeping parts whole. */
function chunks(pages: Page[], size = 2500): string[] {
  const out: string[] = [];
  let current = '';
  for (const p of pages) {
    const t = p.text.trim();
    if (current && current.length + t.length > size) {
      out.push(current);
      current = '';
    }
    current = current ? `${current}\n\n${t}` : t;
  }
  if (current) out.push(current);
  return out;
}

/**
 * Optional: writes question cards from the subject's passages with the user's
 * own Gemini key. The user picks which to keep and stars what the teacher stressed.
 */
export default function AiQuestionsScreen() {
  const { subject } = useLocalSearchParams<{ subject: string }>();
  const subjectId = Number(subject);
  const db = useSQLiteContext();
  const { s, settings } = useApp();
  const { toast } = useRewards();
  const c = useTheme();
  const [passages, setPassages] = useState<Page[] | null>(null);
  const [state, setState] = useState<State>({ step: 'intro' });
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPages(db, subjectId).then((list) => setPassages(list.filter((p) => !p.qa && p.text.trim())));
  }, [db, subjectId]);

  const start = async () => {
    if (!passages?.length) return;
    const groups = chunks(passages);
    setItems([]);
    setState({ step: 'working', done: 0, total: groups.length });
    try {
      for (let i = 0; i < groups.length; i++) {
        const text = groups[i];
        const words = text.split(/\s+/).length;
        const count = Math.max(3, Math.min(8, Math.round(words / 45)));
        const found = await generateQuestions(settings.aiKey, text, detectLanguage(text), count);
        setItems((prev) => [...prev, ...found.map((q) => ({ ...q, include: true, important: false }))]);
        setState({ step: 'working', done: i + 1, total: groups.length });
      }
      setState({ step: 'done' });
    } catch (e) {
      const kind = e instanceof AiError ? e.kind : 'other';
      const message =
        kind === 'key' ? s.aiErrorKey : kind === 'limit' ? s.aiErrorLimit : kind === 'network' ? s.aiErrorNetwork : s.aiErrorOther;
      // Keep whatever came back before the error.
      setState({ step: 'error', message });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const chosen = items.filter((q) => q.include);
      await addPages(
        db,
        subjectId,
        chosen.map((q) => ({
          kind: 'text',
          uri: '',
          label: `${s.questionCard} ✨`,
          question: q.question,
          text: q.answer,
          qa: true,
          important: q.important,
        })),
      );
      haptic('success');
      toast({ icon: 'sparkles', title: s.questionsCount(chosen.length) });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const toggle = (i: number, key: 'include' | 'important') => {
    haptic();
    setItems((list) => list.map((q, j) => (j === i ? { ...q, [key]: !q[key] } : q)));
  };

  const chosen = items.filter((q) => q.include).length;

  return (
    <Screen title={s.aiTitle}>
      {!settings.aiKey ? (
        <Card tone="accent">
          <Txt>{s.aiNoKey}</Txt>
          <Button icon="settings-outline" title={s.settings} onPress={() => router.replace('/settings')} />
        </Card>
      ) : passages && passages.length === 0 ? (
        <Card tone="warning">
          <Txt>{s.aiNoText}</Txt>
        </Card>
      ) : null}

      {settings.aiKey && passages?.length && state.step === 'intro' ? (
        <Card>
          <Row align="flex-start">
            <Icon name="sparkles" color={c.accent} />
            <Txt variant="caption" muted style={{ flex: 1 }}>
              {`${s.partsCount(passages.length)} · ${s.aiPrivacy}`}
            </Txt>
          </Row>
          <Button icon="sparkles-outline" title={s.aiStart} onPress={start} />
        </Card>
      ) : null}

      {state.step === 'working' ? (
        <Card>
          <Row>
            <ActivityIndicator color={c.primary} />
            <Txt style={{ flex: 1 }}>{s.aiWorking(state.done + 1, state.total)}</Txt>
          </Row>
          <ProgressBar value={state.done / state.total} height={6} />
        </Card>
      ) : null}

      {state.step === 'error' ? (
        <Card tone="warning">
          <Txt>{state.message}</Txt>
        </Card>
      ) : null}

      {state.step === 'done' && items.length === 0 ? (
        <Card tone="warning">
          <Txt>{s.aiNone}</Txt>
        </Card>
      ) : null}

      {items.length > 0 ? (
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
      ) : null}

      <View style={{ gap: Spacing.two }}>
        {items.map((q, i) => {
          const dir = detectLanguage(q.question + ' ' + q.answer) === 'ar' ? 'rtl' : 'ltr';
          return (
            <Animated.View key={i} entering={FadeInDown}>
              <Card style={{ padding: Spacing.three, opacity: q.include ? 1 : 0.55 }}>
                <Row align="flex-start">
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: q.include }}
                    accessibilityLabel={q.question}
                    onPress={() => toggle(i, 'include')}
                    hitSlop={8}>
                    <Icon name={q.include ? 'checkbox' : 'square-outline'} color={c.primary} />
                  </Pressable>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt bold dir={dir}>
                      {q.question}
                    </Txt>
                    <Txt variant="caption" muted dir={dir}>
                      {q.answer}
                    </Txt>
                  </View>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: q.important }}
                    accessibilityLabel={s.importantLabel}
                    onPress={() => toggle(i, 'important')}
                    hitSlop={8}>
                    <Icon name={q.important ? 'star' : 'star-outline'} size={26} color={c.accent} />
                  </Pressable>
                </Row>
              </Card>
            </Animated.View>
          );
        })}
      </View>

      {items.length > 0 && state.step !== 'working' ? (
        <Button
          icon="checkmark"
          title={`${s.addToSubject} · ${s.questionsCount(chosen)}`}
          onPress={save}
          loading={saving}
          disabled={chosen === 0}
        />
      ) : null}
    </Screen>
  );
}
