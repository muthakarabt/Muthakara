import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Button, Card, Input, Row, Screen, Section, Stepper, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/lib/app-context';
import type { Language } from '@/lib/db';
import { cancelReminders, scheduleDailyReminder } from '@/lib/reminders';

export default function Settings() {
  const { settings, updateSettings, s } = useApp();
  const c = useTheme();
  const [name, setName] = useState(settings.name);

  const applyReminder = async (enabled: boolean, hour = settings.reminderHour, minute = settings.reminderMinute) => {
    if (enabled) {
      const ok = await scheduleDailyReminder({
        hour,
        minute,
        title: s.reminderTitle(settings.name),
        body: s.reminderBody,
      });
      if (!ok) {
        Alert.alert(s.notifDenied);
        await updateSettings({ reminderEnabled: false });
        return;
      }
    } else {
      await cancelReminders();
    }
    await updateSettings({ reminderEnabled: enabled, reminderHour: hour, reminderMinute: minute });
  };

  const setLanguage = (language: Language) => updateSettings({ language });

  return (
    <Screen>
      <Stack.Screen options={{ title: s.settings }} />

      <Section title={s.yourName}>
        <Input value={name} onChangeText={setName} onBlur={() => updateSettings({ name: name.trim() })} />
      </Section>

      <Section title={s.chooseLanguage}>
        <Row gap={Spacing.two}>
          <Button
            style={{ flex: 1 }}
            variant={settings.language === 'ar' ? 'primary' : 'ghost'}
            title="العربية"
            onPress={() => setLanguage('ar')}
          />
          <Button
            style={{ flex: 1 }}
            variant={settings.language === 'en' ? 'primary' : 'ghost'}
            title="English"
            onPress={() => setLanguage('en')}
          />
        </Row>
      </Section>

      {settings.language === 'ar' ? (
        <Section title={s.iAm}>
          <Row gap={Spacing.two}>
            <Button
              style={{ flex: 1 }}
              variant={settings.gender === 'm' ? 'primary' : 'ghost'}
              icon="🧑‍🎓"
              title={s.male}
              onPress={() => updateSettings({ gender: 'm' })}
            />
            <Button
              style={{ flex: 1 }}
              variant={settings.gender === 'f' ? 'primary' : 'ghost'}
              icon="👩‍🎓"
              title={s.female}
              onPress={() => updateSettings({ gender: 'f' })}
            />
          </Row>
        </Section>
      ) : null}

      <Section title={s.todayGoal}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt>{s.dailyMinutes}</Txt>
            <Stepper
              value={settings.dailyMinutes}
              min={5}
              max={120}
              step={5}
              format={(v) => s.minutesShort(v)}
              onChange={(v) => updateSettings({ dailyMinutes: v })}
            />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt>{s.newPerDay}</Txt>
            <Stepper value={settings.newPerDay} min={1} max={20} onChange={(v) => updateSettings({ newPerDay: v })} />
          </Row>
        </Card>
      </Section>

      <Section title={s.reminder}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt>{s.reminder}</Txt>
            <Switch
              value={settings.reminderEnabled}
              onValueChange={(v) => applyReminder(v)}
              trackColor={{ true: c.primary }}
            />
          </Row>
          {settings.reminderEnabled ? (
            <View style={{ gap: Spacing.two }}>
              <Txt>{s.reminderTime}</Txt>
              {/* Clock time always reads hour:minute, left to right. */}
              <View style={{ flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: Spacing.two, justifyContent: 'center' }}>
                <Stepper
                  value={settings.reminderHour}
                  min={0}
                  max={23}
                  format={(v) => String(v).padStart(2, '0')}
                  onChange={(v) => applyReminder(true, v, settings.reminderMinute)}
                />
                <Txt variant="title">:</Txt>
                <Stepper
                  value={settings.reminderMinute}
                  min={0}
                  max={55}
                  step={5}
                  format={(v) => String(v).padStart(2, '0')}
                  onChange={(v) => applyReminder(true, settings.reminderHour, v)}
                />
              </View>
            </View>
          ) : null}
        </Card>
      </Section>

      <Section title={s.sound}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt>{s.sound}</Txt>
            <Switch
              value={settings.sound}
              onValueChange={(v) => updateSettings({ sound: v })}
              trackColor={{ true: c.primary }}
            />
          </Row>
        </Card>
      </Section>

      <Section title={s.howItWorks}>
        <Card tone="primary">
          <Txt>{s.howItWorksBody}</Txt>
        </Card>
      </Section>
    </Screen>
  );
}
