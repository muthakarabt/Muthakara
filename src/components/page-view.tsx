import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import type { Page } from '@/lib/db';

async function openPdf(uri: string) {
  if (Platform.OS === 'web') {
    // Browsers refuse to navigate to data: links, so open a blob copy in a new tab.
    const blob = await (await fetch(uri)).blob();
    window.open(URL.createObjectURL(blob), '_blank');
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } else {
    await Linking.openURL(uri);
  }
}

/** Shows a study page: a zoomable photo, or a card that opens the PDF at the right page. */
export function PageView({ page, height = 420 }: { page: Pick<Page, 'kind' | 'uri' | 'label'>; height?: number }) {
  const c = useTheme();
  const { s } = useApp();
  const [full, setFull] = useState(false);

  if (page.kind === 'pdf') {
    return (
      <View
        style={{
          borderRadius: Radius.large,
          backgroundColor: c.primarySoft,
          padding: Spacing.five,
          alignItems: 'center',
          gap: Spacing.three,
        }}>
        <Text style={{ fontSize: 56 }}>📄</Text>
        <Txt variant="title" center>
          {page.label}
        </Txt>
        <Txt muted center>
          {s.openFileHint(page.label)}
        </Txt>
        <Button icon="📂" title={s.openFile} onPress={() => openPdf(page.uri)} />
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => setFull(true)}>
        <Image
          source={{ uri: page.uri }}
          style={{ width: '100%', height, borderRadius: Radius.large, backgroundColor: c.card }}
          contentFit="contain"
          transition={200}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            backgroundColor: '#0009',
            borderRadius: 99,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>🔍</Text>
        </View>
      </Pressable>
      <Modal visible={full} animationType="fade" onRequestClose={() => setFull(false)} supportedOrientations={['portrait', 'landscape']}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}>
            <Image source={{ uri: page.uri }} style={{ flex: 1, minHeight: 500 }} contentFit="contain" />
          </ScrollView>
          <Pressable
            onPress={() => setFull(false)}
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#FFFFFF33',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{ color: '#fff', fontSize: 20 }}>✕</Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </>
  );
}
