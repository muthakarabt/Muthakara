import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import {
  Button,
  Card,
  GradientCard,
  IconBadge,
  Input,
  Row,
  Screen,
  Section,
  Segmented,
  Txt,
  type IconName,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useApp } from '@/lib/app-context';
import type { Profile } from '@/lib/db';
import { playSound } from '@/lib/sound';

const PROFILE_ICONS: Record<Profile, IconName> = {
  university: 'school-outline',
  school: 'book-outline',
  self: 'bulb-outline',
};

export default function Welcome() {
  const { settings, updateSettings, s } = useApp();
  const [name, setName] = useState(settings.name);

  const start = async () => {
    await updateSettings({ name: name.trim(), onboarded: true });
    playSound('complete');
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<Button title={s.start} icon="arrow-forward-circle-outline" onPress={start} />}>
        <Animated.View entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: Spacing.three, paddingTop: Spacing.four }}>
          <IconBadge icon="leaf" tone="primary" size={76} />
          <Txt variant="hero" center>
            {s.welcomeTitle}
          </Txt>
          <Txt muted center>
            {s.tagline}
          </Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120)}>
          <Segmented
            options={[
              { value: 'ar', label: 'العربية' },
              { value: 'en', label: 'English' },
            ]}
            value={settings.language}
            onChange={(language) => updateSettings({ language })}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <Section title={s.whoAreYou}>
            {(['university', 'school', 'self'] as Profile[]).map((p) => (
              <Card key={p} selected={settings.profile === p} onPress={() => updateSettings({ profile: p })}>
                <Row>
                  <IconBadge icon={PROFILE_ICONS[p]} tone={settings.profile === p ? 'primary' : 'sky'} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="heading">{s.profiles[p]}</Txt>
                    <Txt variant="caption" muted>
                      {s.profileHints[p]}
                    </Txt>
                  </View>
                </Row>
              </Card>
            ))}
          </Section>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280)} style={{ gap: Spacing.four }}>
          {settings.language === 'ar' ? (
            <View style={{ gap: Spacing.two }}>
              <Txt variant="caption" muted>
                {s.iAm}
              </Txt>
              <Segmented
                options={[
                  { value: 'm', label: s.male },
                  { value: 'f', label: s.female },
                ]}
                value={settings.gender}
                onChange={(gender) => updateSettings({ gender })}
              />
            </View>
          ) : null}
          <Input
            label={s.askName}
            placeholder={s.namePlaceholder}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={start}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360)}>
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
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Txt color="#FFFFFF" variant="heading" center>
                    {n}
                  </Txt>
                </View>
              ))}
            </Row>
          </GradientCard>
        </Animated.View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
