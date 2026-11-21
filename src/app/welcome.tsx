import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Button, GradientCard, Input, Row, Screen, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApp } from '@/lib/app-context';
import type { Language } from '@/lib/db';
import { playSound } from '@/lib/sound';

export default function Welcome() {
  const { settings, updateSettings, s } = useApp();
  const [name, setName] = useState(settings.name);

  const chooseLanguage = (language: Language) => updateSettings({ language });

  const start = async () => {
    await updateSettings({ name: name.trim(), onboarded: true });
    playSound('complete');
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 72 }}>🧠</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150)} style={{ gap: Spacing.two }}>
          <Txt variant="hero" center>
            {s.welcomeTitle}
          </Txt>
          <Txt muted center>
            {s.tagline}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <GradientCard>
            <Txt color="#FFFFFF">{s.welcomeBody}</Txt>
            <Row gap={Spacing.two} style={{ justifyContent: 'center' }}>
              {['1', '3', '7', '14', '30'].map((n) => (
                <View
                  key={n}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: '#FFFFFF26',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{n}</Text>
                </View>
              ))}
            </Row>
          </GradientCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450)} style={{ gap: Spacing.four }}>
          <View style={{ gap: Spacing.two }}>
            <Txt variant="caption" muted>
              {s.chooseLanguage}
            </Txt>
            <Row gap={Spacing.two}>
              <Button
                style={{ flex: 1 }}
                variant={settings.language === 'ar' ? 'primary' : 'ghost'}
                title="العربية"
                onPress={() => chooseLanguage('ar')}
              />
              <Button
                style={{ flex: 1 }}
                variant={settings.language === 'en' ? 'primary' : 'ghost'}
                title="English"
                onPress={() => chooseLanguage('en')}
              />
            </Row>
          </View>
          <Input
            label={s.askName}
            placeholder={s.namePlaceholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={start}
          />
          <Button title={s.start} icon="🚀" onPress={start} />
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
