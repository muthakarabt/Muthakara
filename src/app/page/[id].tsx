import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { PageView } from '@/components/page-view';
import { Button, Card, Icon, Input, Pill, Row, Screen, Section, Txt, confirmAction, haptic, notify } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { deletePage, getPage, resetPage, setPageImportant, updatePageNotes, type PageWithSubject } from '@/lib/db';
import { relativeDay } from '@/lib/i18n';
import { deleteFiles } from '@/lib/media';
import { findVoice, readAloud } from '@/lib/speech';
import { todayStr } from '@/lib/srs';
import { detectLanguage } from '@/lib/text';

export default function PageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pageId = Number(id);
  const db = useSQLiteContext();
  const { s } = useApp();
  const c = useTheme();
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

  const listen = async () => {
    if (speaking) {
      speaking();
      setSpeaking(null);
      return;
    }
    const lang = detectLanguage(text);
    const voice = await findVoice(lang);
    if (!voice) {
      notify(s.noVoice(lang, Platform.OS));
      return;
    }
    const stop = readAloud(text.trim(), { repeats: 1, voice, onDone: () => setSpeaking(null) });
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

  const toggleImportant = async () => {
    if (!page) return;
    haptic();
    await setPageImportant(db, pageId, !page.important);
    await load();
  };

  if (!page) return <Screen title="">{null}</Screen>;
  const today = todayStr();
  const dir = detectLanguage(text) === 'ar' ? 'rtl' : 'ltr';
  const qa = page.qa === 1;

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

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!page.important }}
          onPress={toggleImportant}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            padding: Spacing.three,
            borderRadius: Radius.medium,
            borderWidth: 1.5,
            borderColor: page.important ? c.accent : c.border,
            backgroundColor: page.important ? c.accentSoft : c.card,
          }}>
          <Icon name={page.important ? 'star' : 'star-outline'} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Txt bold>{s.importantLabel}</Txt>
            <Txt variant="caption" muted>
              {s.importantHint}
            </Txt>
          </View>
        </Pressable>

        {qa ? (
          <Section title={s.theQuestion}>
            <Input
              value={question}
              onChangeText={setQuestion}
              placeholder={s.questionTextPlaceholder}
              multiline
              dir={question && detectLanguage(question) === 'en' ? 'ltr' : 'rtl'}
              style={{ fontSize: 17, minHeight: 70 }}
            />
          </Section>
        ) : null}

        <Section
          title={qa ? s.theAnswerLabel : s.passage}
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
          {!text.trim() && !qa ? (
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

        {!qa ? (
          <Section title={s.keywords}>
            <Input placeholder={s.keywordsPlaceholder} value={keywords} onChangeText={setKeywords} multiline />
            <Input label={s.question} placeholder={s.questionPlaceholder} value={question} onChangeText={setQuestion} />
          </Section>
        ) : null}

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
