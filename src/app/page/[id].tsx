import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { PageView } from '@/components/page-view';
import { Button, Card, Input, Pill, Row, Screen, Section, Txt, confirmAction } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApp } from '@/lib/app-context';
import { deletePage, getPage, resetPage, updatePageNotes, type PageWithSubject } from '@/lib/db';
import { relativeDay } from '@/lib/i18n';
import { deleteFiles } from '@/lib/media';
import { readAloud } from '@/lib/speech';
import { todayStr } from '@/lib/srs';
import { detectLanguage } from '@/lib/text';

export default function PageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pageId = Number(id);
  const db = useSQLiteContext();
  const { s } = useApp();
  const [page, setPage] = useState<PageWithSubject | null>(null);
  const [text, setText] = useState('');
  const [keywords, setKeywords] = useState('');
  const [question, setQuestion] = useState('');
  const [saved, setSaved] = useState(false);
  const [speaking, setSpeaking] = useState<null | (() => void)>(null);

  const load = useCallback(async () => {
    const p = await getPage(db, pageId);
    setPage(p);
    setText(p?.text ?? '');
    setKeywords(p?.keywords ?? '');
    setQuestion(p?.question ?? '');
  }, [db, pageId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Stop reading when leaving the screen.
  useEffect(() => () => speaking?.(), [speaking]);

  const save = async () => {
    await updatePageNotes(db, pageId, { text: text.trim(), keywords: keywords.trim(), question: question.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    await load();
  };

  const listen = () => {
    if (speaking) {
      speaking();
      setSpeaking(null);
      return;
    }
    const stop = readAloud(text.trim(), { repeats: 1, onDone: () => setSpeaking(null) });
    setSpeaking(() => stop);
  };

  const reset = async () => {
    const ok = await confirmAction({ title: s.resetProgress, message: '', ok: s.resetProgress, cancel: s.cancel });
    if (!ok) return;
    await resetPage(db, pageId);
    await load();
  };

  const remove = async () => {
    const ok = await confirmAction({ title: s.deletePage, message: s.deletePageConfirm, ok: s.delete, cancel: s.cancel });
    if (!ok) return;
    deleteFiles([await deletePage(db, pageId)]);
    router.back();
  };

  if (!page) return <Screen title="">{null}</Screen>;
  const today = todayStr();
  const dir = detectLanguage(text) === 'ar' ? 'rtl' : 'ltr';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={page.label}>
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

        <Section
          title={s.passage}
          action={
            text.trim() ? (
              <Button
                small
                variant="secondary"
                icon={speaking ? 'stop' : 'volume-high-outline'}
                title={speaking ? s.stopListening : s.listen}
                onPress={listen}
              />
            ) : null
          }>
          {!text.trim() ? (
            <Txt variant="caption" muted>
              {s.addTextHint}
            </Txt>
          ) : null}
          <Input
            value={text}
            onChangeText={setText}
            placeholder={s.textPlaceholder}
            multiline
            dir={text ? dir : undefined}
            style={{ fontSize: 17, minHeight: 140 }}
          />
        </Section>

        {page.uri ? <PageView page={page} height={320} /> : null}

        <Section title={s.keywords}>
          <Input placeholder={s.keywordsPlaceholder} value={keywords} onChangeText={setKeywords} multiline />
          <Input label={s.question} placeholder={s.questionPlaceholder} value={question} onChangeText={setQuestion} />
        </Section>

        <Button icon={saved ? 'checkmark-done' : 'save-outline'} title={saved ? s.saved : s.save} onPress={save} />

        <Row gap={Spacing.two}>
          {page.studied_on ? (
            <Button style={{ flex: 1 }} small variant="ghost" icon="refresh" title={s.resetProgress} onPress={reset} />
          ) : null}
          <Button style={{ flex: 1 }} small variant="danger" icon="trash-outline" title={s.deletePage} onPress={remove} />
        </Row>
      </Screen>
    </KeyboardAvoidingView>
  );
}
