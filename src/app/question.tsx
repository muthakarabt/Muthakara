import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { useRewards } from '@/components/rewards';
import { Button, Card, Icon, IconButton, Input, Row, Screen, Txt, haptic, notify } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { addPages, countPages } from '@/lib/db';
import { useReader } from '@/lib/reader';
import { cleanOcrText, detectLanguage } from '@/lib/text';

type Field = 'question' | 'answer';

/**
 * A question card: the question and its answer, each snapped from a photo
 * (read into text) or typed. `?subject=ID`.
 */
export default function QuestionScreen() {
  const { subject } = useLocalSearchParams<{ subject: string }>();
  const subjectId = Number(subject);
  const db = useSQLiteContext();
  const { s } = useApp();
  const { toast } = useRewards();
  const c = useTheme();
  const engine = useReader();
  const [values, setValues] = useState<Record<Field, string>>({ question: '', answer: '' });
  const [important, setImportant] = useState(false);
  const [pending, setPending] = useState<{ field: Field; uri: string } | null>(null);
  const [failed, setFailed] = useState<Field | null>(null);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(0);

  // Read a picked photo once the reading engine is ready.
  const { status, recognize } = engine;
  useEffect(() => {
    if (!pending || status === 'loading') return;
    let alive = true;
    const { field, uri } = pending;
    const fail = () => {
      if (!alive) return;
      setFailed(field);
      setPending(null);
    };
    if (status === 'failed') {
      fail();
      return;
    }
    recognize(uri)
      .then((raw) => {
        if (!alive) return;
        const text = cleanOcrText(raw).replace(/\n{2,}/g, '\n');
        if (!text) return fail();
        setValues((v) => ({ ...v, [field]: v[field].trim() ? `${v[field].trim()}\n${text}` : text }));
        setPending(null);
      })
      .catch(fail);
    return () => {
      alive = false;
    };
  }, [pending, status, recognize]);

  const pick = async (field: Field, source: 'camera' | 'gallery') => {
    setFailed(null);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        notify(s.cameraDenied);
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.9,
      // Cropping to just the question (or just the answer) is what makes this work on a full page.
      allowsEditing: Platform.OS !== 'web',
    };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (!res.canceled && res.assets[0]) setPending({ field, uri: res.assets[0].uri });
  };

  const ready = values.question.trim() && values.answer.trim();

  const save = async (another: boolean) => {
    if (!ready) {
      notify(s.needBoth);
      return;
    }
    setSaving(true);
    try {
      const n = (await countPages(db, subjectId)) + 1;
      await addPages(db, subjectId, [
        {
          kind: 'text',
          uri: '',
          label: `${s.questionCard} ${n}`,
          question: values.question.trim(),
          text: values.answer.trim(),
          qa: true,
          important,
        },
      ]);
      haptic('success');
      if (another) {
        setAdded((a) => a + 1);
        setValues({ question: '', answer: '' });
        setImportant(false);
        toast({ icon: 'checkmark-circle', title: s.cardSaved });
      } else {
        toast({ icon: 'checkmark-circle', title: s.cardSaved });
        router.back();
      }
    } finally {
      setSaving(false);
    }
  };

  const block = (field: Field) => {
    const value = values[field];
    const busy = pending?.field === field;
    return (
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={Spacing.two} style={{ flex: 1 }}>
            <Icon name={field === 'question' ? 'help-circle-outline' : 'bulb-outline'} color={c.primary} />
            <Txt variant="heading">{field === 'question' ? s.theQuestion : s.theAnswerLabel}</Txt>
          </Row>
          <Row gap={Spacing.two}>
            <IconButton icon="camera-outline" label={s.camera} size={40} onPress={() => pick(field, 'camera')} />
            <IconButton icon="images-outline" label={s.gallery} size={40} onPress={() => pick(field, 'gallery')} />
          </Row>
        </Row>
        {busy ? (
          <Row>
            <ActivityIndicator color={c.primary} />
            <Txt variant="caption" muted>
              {s.readingPhoto}
            </Txt>
          </Row>
        ) : null}
        {failed === field ? (
          <Txt variant="caption" color={c.warning}>
            {s.photoReadFailed}
          </Txt>
        ) : null}
        <Input
          value={value}
          onChangeText={(t) => setValues((v) => ({ ...v, [field]: t }))}
          placeholder={field === 'question' ? s.questionTextPlaceholder : s.answerTextPlaceholder}
          multiline
          dir={value ? (detectLanguage(value) === 'ar' ? 'rtl' : 'ltr') : undefined}
          style={{ minHeight: field === 'question' ? 70 : 110, fontSize: 17 }}
        />
      </Card>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={s.questionCard}>
        {engine.element}
        <Txt variant="caption" muted>
          {s.questionCardHint}
        </Txt>
        {block('question')}
        {block('answer')}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: important }}
          onPress={() => {
            haptic();
            setImportant((v) => !v);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three,
            padding: Spacing.four,
            borderRadius: Radius.medium,
            borderWidth: 1.5,
            borderColor: important ? c.accent : c.border,
            backgroundColor: important ? c.accentSoft : c.card,
          }}>
          <Icon name={important ? 'star' : 'star-outline'} size={26} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Txt bold>{s.importantLabel}</Txt>
            <Txt variant="caption" muted>
              {s.importantHint}
            </Txt>
          </View>
        </Pressable>

        <Button title={s.saveCard} icon="checkmark" onPress={() => save(false)} loading={saving} disabled={!ready || !!pending} />
        <Button
          variant="secondary"
          icon="add"
          title={added > 0 ? `${s.saveAndNext} · ${added}` : s.saveAndNext}
          onPress={() => save(true)}
          disabled={!ready || saving || !!pending}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
