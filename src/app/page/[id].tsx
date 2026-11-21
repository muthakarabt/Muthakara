import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';

import { PageView } from '@/components/page-view';
import { Button, Card, Input, Pill, Row, Screen, Section, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApp } from '@/lib/app-context';
import { deletePage, getPage, resetPage, updatePageNotes, type PageWithSubject } from '@/lib/db';
import { relativeDay } from '@/lib/i18n';
import { deleteFiles } from '@/lib/media';
import { todayStr } from '@/lib/srs';

export default function PageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pageId = Number(id);
  const db = useSQLiteContext();
  const { s } = useApp();
  const [page, setPage] = useState<PageWithSubject | null>(null);
  const [keywords, setKeywords] = useState('');
  const [question, setQuestion] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const p = await getPage(db, pageId);
    setPage(p);
    setKeywords(p?.keywords ?? '');
    setQuestion(p?.question ?? '');
  }, [db, pageId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    await updatePageNotes(db, pageId, { keywords: keywords.trim(), question: question.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    await load();
  };

  const reset = () =>
    Alert.alert(s.resetProgress, '', [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.resetProgress,
        onPress: async () => {
          await resetPage(db, pageId);
          await load();
        },
      },
    ]);

  const remove = () =>
    Alert.alert(s.deletePage, s.deletePageConfirm, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          const orphan = await deletePage(db, pageId);
          deleteFiles([orphan]);
          router.back();
        },
      },
    ]);

  if (!page) return <Screen>{null}</Screen>;
  const today = todayStr();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Stack.Screen options={{ title: page.label }} />
        <PageView page={page} />

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="caption" muted>
              {s.nextReview}
            </Txt>
            {page.studied_on ? (
              <Pill text={relativeDay(page.due ?? today, today, s)} />
            ) : (
              <Pill tone="muted" text={s.notStudied} />
            )}
          </Row>
          <Txt variant="caption" muted>
            {s.reviewsCount(page.reviews)}
          </Txt>
        </Card>

        <Section title={s.keywords}>
          <Input placeholder={s.keywordsPlaceholder} value={keywords} onChangeText={setKeywords} multiline />
          <Input label={s.question} placeholder={s.questionPlaceholder} value={question} onChangeText={setQuestion} />
          <Button icon={saved ? '✓' : '💾'} title={saved ? s.saved : s.save} onPress={save} />
        </Section>

        <Row gap={Spacing.two}>
          {page.studied_on ? (
            <Button style={{ flex: 1 }} small variant="ghost" icon="↺" title={s.resetProgress} onPress={reset} />
          ) : null}
          <Button style={{ flex: 1 }} small variant="danger" icon="🗑️" title={s.deletePage} onPress={remove} />
        </Row>
      </Screen>
    </KeyboardAvoidingView>
  );
}
