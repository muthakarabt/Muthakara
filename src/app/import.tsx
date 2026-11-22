import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useRewards } from '@/components/rewards';
import { Button, Card, Icon, Input, Pill, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import { addPages, countPages, type NewPage } from '@/lib/db';
import { clearPendingImages, getPendingImages } from '@/lib/import-queue';
import { extensionOf, persistFile } from '@/lib/media';
import { ocrAvailable, recognizeText } from '@/lib/ocr';
import { cleanOcrText, detectLanguage, splitIntoParts } from '@/lib/text';

type Ocr = { status: 'reading' | 'ready' | 'failed'; progress: number; text: string };

/**
 * Turns photos (or pasted text) into study parts: reads the text from each
 * photo, lets the user fix it, then splits it into short parts.
 * `?subject=ID` for the photos queued on the subject screen, `&mode=text` to paste text.
 */
export default function ImportScreen() {
  const { subject, mode } = useLocalSearchParams<{ subject: string; mode?: string }>();
  const subjectId = Number(subject);
  const db = useSQLiteContext();
  const { s } = useApp();
  const { toast } = useRewards();
  const c = useTheme();
  const [uris] = useState(() => (mode === 'text' ? [] : getPendingImages(subjectId)));
  const [index, setIndex] = useState(0);
  const [ocr, setOcr] = useState<Ocr>({ status: ocrAvailable ? 'reading' : 'failed', progress: 0, text: '' });
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(0);

  const textMode = mode === 'text';
  const uri = uris[index];
  const total = uris.length;

  // Read the current photo's text.
  useEffect(() => {
    if (textMode || !uri || !ocrAvailable) return;
    let alive = true;
    recognizeText(uri, (p) => alive && setOcr((o) => ({ ...o, progress: p })))
      .then((raw) => {
        if (!alive) return;
        const clean = cleanOcrText(raw);
        setOcr({ status: clean ? 'ready' : 'failed', progress: 1, text: clean });
        setText(clean);
      })
      .catch(() => alive && setOcr({ status: 'failed', progress: 0, text: '' }));
    return () => {
      alive = false;
    };
  }, [uri, textMode]);

  const parts = splitIntoParts(text.trim());
  const finished = (count: number) => {
    clearPendingImages();
    if (count > 0) toast({ icon: 'checkmark-circle', title: s.partsCount(count) });
    router.back();
  };

  const advance = (count: number) => {
    const sum = added + count;
    if (textMode || index + 1 >= total) {
      finished(sum);
      return;
    }
    setAdded(sum);
    setIndex(index + 1);
    setText('');
    setOcr({ status: ocrAvailable ? 'reading' : 'failed', progress: 0, text: '' });
  };

  const save = async (withText: boolean) => {
    setSaving(true);
    try {
      const n = (await countPages(db, subjectId)) + 1;
      let pages: NewPage[] = [];
      if (textMode) {
        const label = s.textN(n);
        pages = parts.map((p, i) => ({ kind: 'text', uri: '', label: s.partOf(label, i + 1, parts.length), text: p }));
      } else {
        const stored = await persistFile(uri, extensionOf(uri, 'jpg'));
        const label = s.imageN(n);
        if (withText && parts.length) {
          pages = parts.map((p, i) => ({
            // On the web the photo is stored inline, so keep one copy (on the first part) to save space.
            kind: Platform.OS === 'web' && i > 0 ? 'text' : 'image',
            uri: Platform.OS === 'web' && i > 0 ? '' : stored,
            label: s.partOf(label, i + 1, parts.length),
            text: p,
          }));
        } else {
          pages = [{ kind: 'image', uri: stored, label }];
        }
      }
      await addPages(db, subjectId, pages);
      advance(pages.length);
    } finally {
      setSaving(false);
    }
  };

  if (!textMode && total === 0) {
    return (
      <Screen title={s.importTitle}>
        <Txt muted center>
          {s.noPages}
        </Txt>
      </Screen>
    );
  }

  const dir = detectLanguage(text) === 'ar' ? 'rtl' : 'ltr';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={textMode ? s.pasteTitle : s.importTitle} right={total > 1 ? <Pill text={`${index + 1}/${total}`} /> : null}>
        {!textMode ? (
          <Animated.View key={uri} entering={FadeIn} style={{ gap: Spacing.three }}>
            {total > 1 ? (
              <Txt variant="caption" muted>
                {s.imageXofY(index + 1, total)}
              </Txt>
            ) : null}
            <Image
              source={{ uri }}
              style={{ width: '100%', height: 220, borderRadius: Radius.large, backgroundColor: c.card }}
              contentFit="contain"
            />
          </Animated.View>
        ) : null}

        {!textMode && ocr.status === 'reading' ? (
          <Card>
            <Row>
              <ActivityIndicator color={c.primary} />
              <Txt style={{ flex: 1 }}>{ocr.progress > 0 ? s.readingProgress(Math.round(ocr.progress * 100)) : s.reading}</Txt>
            </Row>
            <ProgressBar value={ocr.progress} height={6} />
          </Card>
        ) : null}

        {!textMode && ocr.status === 'failed' ? (
          <Card tone="warning">
            <Row align="flex-start">
              <Icon name="information-circle-outline" color={c.warning} />
              <Txt variant="caption" style={{ flex: 1 }}>
                {ocrAvailable ? s.ocrFailed : s.ocrUnavailable}
              </Txt>
            </Row>
          </Card>
        ) : null}

        {textMode || ocr.status !== 'reading' ? (
          <View style={{ gap: Spacing.three }}>
            {ocr.status === 'ready' && !textMode ? (
              <Txt variant="caption" muted>
                {s.checkText}
              </Txt>
            ) : null}
            <Input
              value={text}
              onChangeText={setText}
              placeholder={s.textPlaceholder}
              multiline
              dir={text ? dir : undefined}
              style={{ minHeight: 200, fontSize: 17 }}
            />
            {parts.length > 0 ? <Pill icon="layers-outline" text={s.partsPreview(parts.length)} /> : null}
            <Button
              title={s.saveText}
              icon="checkmark"
              onPress={() => save(true)}
              loading={saving}
              disabled={parts.length === 0}
            />
            {!textMode ? (
              <Button variant="ghost" icon="image-outline" title={s.saveImageOnly} onPress={() => save(false)} disabled={saving} />
            ) : null}
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
