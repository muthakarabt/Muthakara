import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';

import { GAME_ICONS, GamePicker } from '@/components/game-picker';
import {
  Button,
  Card,
  Empty,
  GradientCard,
  Icon,
  IconBadge,
  IconButton,
  Input,
  Pill,
  Row,
  Screen,
  Section,
  Txt,
  confirmAction,
  notify,
  type IconName,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import {
  deleteSubject,
  getSubject,
  listPages,
  renameSubject,
  setSubjectGame,
  type GameType,
  type Page,
  type Subject,
} from '@/lib/db';
import { relativeDay } from '@/lib/i18n';
import { setPendingFile, setPendingImages } from '@/lib/import-queue';
import { deleteFiles } from '@/lib/media';
import { todayStr } from '@/lib/srs';
import { detectLanguage } from '@/lib/text';

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = Number(id);
  const db = useSQLiteContext();
  const { s } = useApp();
  const c = useTheme();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    const [sub, list] = await Promise.all([getSubject(db, subjectId), listPages(db, subjectId)]);
    setSubject(sub);
    setPages(list);
  }, [db, subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const importImages = (uris: string[]) => {
    if (!uris.length) return;
    setPendingImages(subjectId, uris);
    router.push(`/import?subject=${subjectId}`);
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify(s.cameraDenied);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      // On phones, let the user crop to just the text: it makes reading the photo more accurate.
      allowsEditing: Platform.OS !== 'web',
    });
    if (!res.canceled) importImages(res.assets.map((a) => a.uri));
  };

  const fromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      selectionLimit: 30,
      quality: 0.85,
    });
    if (!res.canceled) importImages(res.assets.map((a) => a.uri));
  };

  const fromPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    setPendingFile(subjectId, { uri: res.assets[0].uri, name: res.assets[0].name });
    router.push(`/file?subject=${subjectId}`);
  };

  const remove = async () => {
    const ok = await confirmAction({
      title: s.deleteSubject,
      message: s.deleteSubjectConfirm,
      ok: s.delete,
      cancel: s.cancel,
    });
    if (!ok) return;
    deleteFiles(await deleteSubject(db, subjectId));
    router.back();
  };

  const saveName = async () => {
    if (renaming?.trim()) await renameSubject(db, subjectId, renaming.trim());
    setRenaming(null);
    await load();
  };

  const chooseGame = async (g: GameType) => {
    await setSubjectGame(db, subjectId, g);
    setPicking(false);
    await load();
  };

  const today = todayStr();
  const fresh = pages.filter((p) => !p.studied_on).length;
  const due = pages.filter((p) => p.due && p.due <= today).length;
  const playable = pages.some((p) => p.text.trim() || p.keywords.trim());
  const game = subject?.game ?? 'mix';

  const addButtons: { icon: IconName; title: string; onPress: () => void }[] = [
    { icon: 'help-circle-outline', title: s.questionCard, onPress: () => router.push(`/question?subject=${subjectId}`) },
    { icon: 'camera-outline', title: s.camera, onPress: fromCamera },
    { icon: 'images-outline', title: s.gallery, onPress: fromGallery },
    { icon: 'document-text-outline', title: s.pdf, onPress: fromPdf },
    { icon: 'clipboard-outline', title: s.pasteText, onPress: () => router.push(`/import?subject=${subjectId}&mode=text`) },
  ];

  return (
    <Screen
      title={subject?.title ?? ''}
      right={<IconButton icon="create-outline" label={s.rename} onPress={() => setRenaming(subject?.title ?? '')} />}>
      {renaming !== null ? (
        <Card>
          <Input label={s.subjectTitle} value={renaming} onChangeText={setRenaming} autoFocus onSubmitEditing={saveName} />
          <Row gap={Spacing.two}>
            <Button style={{ flex: 1 }} title={s.save} onPress={saveName} />
            <Button style={{ flex: 1 }} variant="ghost" title={s.cancel} onPress={() => setRenaming(null)} />
          </Row>
        </Card>
      ) : null}

      <GradientCard>
        <Txt color="#FFFFFFDD" variant="caption">
          {s.subjectStats(pages.length, fresh, due)}
        </Txt>
        <Row gap={Spacing.two}>
          <Button
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
            variant="secondary"
            icon="book-outline"
            title={s.study}
            disabled={fresh === 0}
            onPress={() => router.push(`/study?subject=${subjectId}`)}
          />
          <Button
            style={{ flex: 1 }}
            variant="accent"
            icon="repeat"
            title={s.review}
            disabled={due === 0}
            onPress={() => router.push(`/review?subject=${subjectId}`)}
          />
        </Row>
        <Button
          variant="light"
          icon="game-controller-outline"
          title={`${s.play} · ${s.games[game]}`}
          disabled={!playable}
          onPress={() => router.push(`/games?subject=${subjectId}&game=${game}`)}
        />
      </GradientCard>

      <Section title={s.addContent}>
        <Row wrap gap={Spacing.two} align="stretch">
          {addButtons.map((b) => (
            <Card
              key={b.icon}
              onPress={b.onPress}
              style={{ width: '48%', flexGrow: 1, alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.two }}>
              <IconBadge icon={b.icon} tone="primary" size={42} />
              <Txt variant="caption" bold center>
                {b.title}
              </Txt>
            </Card>
          ))}
        </Row>
      </Section>

      {pages.some((p) => !p.qa && p.text.trim()) ? (
        <Button
          variant="secondary"
          icon="sparkles-outline"
          title={s.aiButton}
          onPress={() => router.push(`/ai-questions?subject=${subjectId}`)}
        />
      ) : null}

      <Section
        title={s.testStyle}
        action={
          <Button
            small
            variant="secondary"
            icon={picking ? 'close' : GAME_ICONS[game]}
            title={picking ? s.cancel : s.games[game]}
            onPress={() => setPicking((p) => !p)}
          />
        }>
        {picking ? <GamePicker value={game} onChange={chooseGame} /> : (
          <Txt variant="caption" muted>
            {`${s.gameDescs[game]} · ${s.testStyleHint}`}
          </Txt>
        )}
      </Section>

      <Section title={s.partsCount(pages.length)}>
        {pages.length === 0 ? <Empty icon="leaf-outline" text={s.noPages} /> : null}
        <View style={{ gap: Spacing.two }}>
          {pages.map((p) => {
            const isDue = !!p.due && p.due <= today;
            const snippet = (p.qa ? p.question : p.text).trim();
            return (
              <Card key={p.id} onPress={() => router.push(`/page/${p.id}`)} style={{ padding: Spacing.three }}>
                <Row>
                  {p.kind === 'image' && p.uri ? (
                    <Image
                      source={{ uri: p.uri }}
                      style={{ width: 52, height: 52, borderRadius: Radius.small, backgroundColor: c.border }}
                      contentFit="cover"
                    />
                  ) : (
                    <IconBadge
                      icon={p.qa ? 'help-circle-outline' : p.kind === 'pdf' ? 'document-text-outline' : 'reader-outline'}
                      tone={p.qa ? 'accent' : 'sky'}
                      size={52}
                    />
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row gap={4} style={{ flex: 1 }}>
                        {p.important ? <Icon name="star" size={14} color={c.accent} /> : null}
                        <Txt variant="caption" bold numberOfLines={1} style={{ flex: 1 }}>
                          {p.label}
                        </Txt>
                      </Row>
                      {!p.studied_on ? (
                        <Pill tone="muted" text={s.statusNew} />
                      ) : (
                        <Pill tone={isDue ? 'accent' : 'primary'} text={relativeDay(p.due ?? today, today, s)} />
                      )}
                    </Row>
                    {snippet ? (
                      <Txt
                        variant="caption"
                        muted
                        numberOfLines={2}
                        dir={detectLanguage(snippet) === 'ar' ? 'rtl' : 'ltr'}>
                        {snippet}
                      </Txt>
                    ) : null}
                  </View>
                </Row>
              </Card>
            );
          })}
        </View>
      </Section>

      <Button variant="danger" icon="trash-outline" title={s.deleteSubject} onPress={remove} />

    </Screen>
  );
}
