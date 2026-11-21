import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { useRewards } from '@/components/rewards';
import { Button, Card, Empty, Input, Pill, Row, Screen, Section, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp, useDirection } from '@/lib/app-context';
import {
  addPages,
  countPages,
  deleteSubject,
  getSubject,
  listPages,
  renameSubject,
  type Page,
  type Subject,
} from '@/lib/db';
import { relativeDay } from '@/lib/i18n';
import { deleteFiles, extensionOf, persistFile } from '@/lib/media';
import { todayStr } from '@/lib/srs';

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = Number(id);
  const db = useSQLiteContext();
  const { s } = useApp();
  const { toast } = useRewards();
  const d = useDirection();
  const c = useTheme();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<{ uri: string } | null>(null);
  const [range, setRange] = useState({ from: '1', to: '10' });
  const [renaming, setRenaming] = useState<string | null>(null);

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

  const addImages = async (uris: string[]) => {
    if (uris.length === 0) return;
    setBusy(true);
    try {
      const start = (await countPages(db, subjectId)) + 1;
      const saved = [];
      for (let i = 0; i < uris.length; i++) {
        const uri = await persistFile(uris[i], extensionOf(uris[i], 'jpg'));
        saved.push({ kind: 'image' as const, uri, label: s.imageN(start + i) });
      }
      await addPages(db, subjectId, saved);
      toast({ icon: '📸', title: s.pagesCount(saved.length) });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(s.cameraDenied);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled) await addImages(res.assets.map((a) => a.uri));
  };

  const fromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      selectionLimit: 50,
      quality: 0.8,
    });
    if (!res.canceled) await addImages(res.assets.map((a) => a.uri));
  };

  const fromPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    setBusy(true);
    try {
      const uri = await persistFile(res.assets[0].uri, 'pdf');
      setRange({ from: '1', to: '10' });
      setPdf({ uri });
    } finally {
      setBusy(false);
    }
  };

  const confirmPdf = async () => {
    if (!pdf) return;
    const from = Math.max(1, parseInt(range.from, 10) || 1);
    const to = Math.min(from + 499, Math.max(from, parseInt(range.to, 10) || from));
    const list = [];
    for (let n = from; n <= to; n++) list.push({ kind: 'pdf' as const, uri: pdf.uri, label: s.pageN(n) });
    await addPages(db, subjectId, list);
    setPdf(null);
    toast({ icon: '📄', title: s.pagesCount(list.length) });
    await load();
  };

  const cancelPdf = () => {
    if (pdf) deleteFiles([pdf.uri]);
    setPdf(null);
  };

  const remove = () =>
    Alert.alert(s.deleteSubject, s.deleteSubjectConfirm, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete,
        style: 'destructive',
        onPress: async () => {
          const uris = await deleteSubject(db, subjectId);
          deleteFiles(uris);
          router.back();
        },
      },
    ]);

  const saveName = async () => {
    if (renaming?.trim()) await renameSubject(db, subjectId, renaming);
    setRenaming(null);
    await load();
  };

  const today = todayStr();
  const fresh = pages.filter((p) => !p.studied_on).length;
  const due = pages.filter((p) => p.due && p.due <= today).length;

  return (
    <Screen>
      <Stack.Screen options={{ title: subject?.title ?? '' }} />

      {renaming !== null ? (
        <Card>
          <Input label={s.subjectTitle} value={renaming} onChangeText={setRenaming} autoFocus />
          <Row gap={Spacing.two}>
            <Button style={{ flex: 1 }} title={s.save} onPress={saveName} />
            <Button style={{ flex: 1 }} variant="ghost" title={s.cancel} onPress={() => setRenaming(null)} />
          </Row>
        </Card>
      ) : null}

      <Row gap={Spacing.two}>
        <Button
          style={{ flex: 1 }}
          icon="📖"
          title={s.studyThis}
          disabled={fresh === 0}
          onPress={() => router.push(`/study?subject=${subjectId}`)}
        />
        <Button
          style={{ flex: 1 }}
          variant="warning"
          icon="🔁"
          title={s.reviewThis}
          disabled={due === 0}
          onPress={() => router.push(`/review?subject=${subjectId}`)}
        />
      </Row>

      <Section title={s.addPages}>
        <Row gap={Spacing.two}>
          <Button style={{ flex: 1 }} small variant="secondary" icon="📷" title={s.camera} onPress={fromCamera} loading={busy} />
          <Button style={{ flex: 1 }} small variant="secondary" icon="🖼️" title={s.gallery} onPress={fromGallery} loading={busy} />
          <Button style={{ flex: 1 }} small variant="secondary" icon="📄" title={s.pdf} onPress={fromPdf} loading={busy} />
        </Row>
      </Section>

      <Section title={`${s.subjectStats(pages.length, fresh, due)}`}>
        {pages.length === 0 ? <Empty icon="🗂️" text={s.noPages} /> : null}
        <View style={{ flexDirection: d.row, flexWrap: 'wrap', gap: Spacing.three }}>
          {pages.map((p) => {
            const isDue = p.due && p.due <= today;
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/page/${p.id}`)}
                style={({ pressed }) => ({
                  width: '47%',
                  flexGrow: 1,
                  maxWidth: '50%',
                  borderRadius: Radius.medium,
                  overflow: 'hidden',
                  backgroundColor: c.card,
                  borderWidth: 1,
                  borderColor: isDue ? c.warning : c.border,
                  opacity: pressed ? 0.8 : 1,
                })}>
                {p.kind === 'image' ? (
                  <Image source={{ uri: p.uri }} style={{ width: '100%', height: 130 }} contentFit="cover" />
                ) : (
                  <View style={{ height: 130, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft }}>
                    <Text style={{ fontSize: 40 }}>📄</Text>
                  </View>
                )}
                <View style={{ padding: Spacing.two, gap: 4 }}>
                  <Txt variant="caption" numberOfLines={1} style={{ fontWeight: '700' }}>
                    {p.label}
                  </Txt>
                  <Row gap={4}>
                    {!p.studied_on ? (
                      <Pill tone="muted" text={s.statusNew} />
                    ) : (
                      <Pill tone={isDue ? 'warning' : 'primary'} text={relativeDay(p.due ?? today, today, s)} />
                    )}
                  </Row>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Row gap={Spacing.two}>
        <Button style={{ flex: 1 }} small variant="ghost" icon="✏️" title={s.rename} onPress={() => setRenaming(subject?.title ?? '')} />
        <Button style={{ flex: 1 }} small variant="danger" icon="🗑️" title={s.deleteSubject} onPress={remove} />
      </Row>

      <Modal visible={pdf !== null} transparent animationType="fade" onRequestClose={cancelPdf}>
        <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: Spacing.four }}>
          <Card>
            <Txt variant="heading">{s.pdfPagesTitle}</Txt>
            <Txt variant="caption" muted>
              {s.pdfPagesHint}
            </Txt>
            <Row gap={Spacing.three}>
              <View style={{ flex: 1 }}>
                <Input
                  label={s.fromPage}
                  keyboardType="number-pad"
                  value={range.from}
                  onChangeText={(v) => setRange((r) => ({ ...r, from: v.replace(/\D/g, '') }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={s.toPage}
                  keyboardType="number-pad"
                  value={range.to}
                  onChangeText={(v) => setRange((r) => ({ ...r, to: v.replace(/\D/g, '') }))}
                />
              </View>
            </Row>
            <Row gap={Spacing.two}>
              <Button style={{ flex: 1 }} title={s.add} onPress={confirmPdf} />
              <Button style={{ flex: 1 }} variant="ghost" title={s.cancel} onPress={cancelPdf} />
            </Row>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
