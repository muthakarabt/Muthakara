import { useState } from 'react';
import { Linking, Platform, Switch, View } from 'react-native';

import { Button, Card, IconBadge, Input, Row, Screen, Section, Segmented, Stepper, Txt, notify } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { aiAvailable } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import type { Profile } from '@/lib/db';
import { buildIcs, downloadIcs, googleCalendarUrl } from '@/lib/calendar';
import { pickForDay } from '@/lib/i18n';
import { todayStr } from '@/lib/srs';
import { scheduleDailyReminder } from '@/lib/reminders';

export default function Settings() {
  const { settings, updateSettings, s } = useApp();
  const c = useTheme();
  const [name, setName] = useState(settings.name);
  const [aiCode, setAiCode] = useState(settings.aiCode);

  const toggleReminder = async (enabled: boolean) => {
    if (enabled && Platform.OS !== 'web') {
      // Ask for permission right away so we can tell the user if it is blocked.
      const ok = await scheduleDailyReminder({
        hour: settings.reminderHour,
        minute: settings.reminderMinute,
        title: s.reminderTitle(settings.name),
        bodies: s.reminders,
      });
      if (!ok) {
        notify(s.notifDenied);
        return;
      }
    }
    await updateSettings({ reminderEnabled: enabled });
  };

  const row = (label: string, control: React.ReactNode) => (
    <Row style={{ justifyContent: 'space-between' }}>
      <Txt style={{ flex: 1 }}>{label}</Txt>
      {control}
    </Row>
  );

  return (
    <Screen title={s.settings}>
      <Section title={s.yourName}>
        <Input value={name} onChangeText={setName} onBlur={() => updateSettings({ name: name.trim() })} />
      </Section>

      <Section title={s.chooseLanguage}>
        <Segmented
          options={[
            { value: 'ar', label: 'العربية' },
            { value: 'en', label: 'English' },
          ]}
          value={settings.language}
          onChange={(language) => updateSettings({ language })}
        />
        {settings.language === 'ar' ? (
          <Segmented
            options={[
              { value: 'm', label: s.male },
              { value: 'f', label: s.female },
            ]}
            value={settings.gender}
            onChange={(gender) => updateSettings({ gender })}
          />
        ) : null}
      </Section>

      <Section title={s.whoAreYou}>
        <Segmented<Profile>
          options={(['university', 'school', 'self'] as Profile[]).map((p) => ({ value: p, label: s.profiles[p] }))}
          value={settings.profile}
          onChange={(profile) => updateSettings({ profile })}
        />
      </Section>

      <Section title={s.studySession}>
        <Card>
          {row(
            s.dailyMinutes,
            <Stepper
              value={settings.dailyMinutes}
              min={5}
              max={120}
              step={5}
              format={(v) => s.minutesShort(v)}
              onChange={(v) => updateSettings({ dailyMinutes: v })}
            />,
          )}
          <View style={{ gap: Spacing.two }}>
            <Txt>{s.answerTime}</Txt>
            <Segmented
              options={[30, 60, 90].map((v) => ({ value: v, label: s.seconds(v) }))}
              value={settings.answerSeconds}
              onChange={(v) => updateSettings({ answerSeconds: v })}
            />
          </View>
          <View style={{ gap: Spacing.two }}>
            <Txt>{s.listenRepeats}</Txt>
            <Segmented
              options={[1, 2].map((v) => ({ value: v, label: s.times(v) }))}
              value={settings.listenRepeats}
              onChange={(v) => updateSettings({ listenRepeats: v })}
            />
          </View>
        </Card>
      </Section>

      <Section title={s.reminder}>
        <Card>
          {Platform.OS !== 'web'
            ? row(
                s.reminder,
                <Switch value={settings.reminderEnabled} onValueChange={toggleReminder} trackColor={{ true: c.primary }} />,
              )
            : null}
          {Platform.OS === 'web' || settings.reminderEnabled ? (
            <View style={{ gap: Spacing.two }}>
              <Txt>{s.reminderTime}</Txt>
              {/* Clock time always reads hour:minute, left to right. */}
              <View
                style={{ flexDirection: 'row', direction: 'ltr', alignItems: 'center', gap: Spacing.two, justifyContent: 'center' }}>
                <Stepper
                  value={settings.reminderHour}
                  min={0}
                  max={23}
                  format={(v) => String(v).padStart(2, '0')}
                  onChange={(v) => updateSettings({ reminderHour: v })}
                />
                <Txt variant="title">:</Txt>
                <Stepper
                  value={settings.reminderMinute}
                  min={0}
                  max={55}
                  step={5}
                  format={(v) => String(v).padStart(2, '0')}
                  onChange={(v) => updateSettings({ reminderMinute: v })}
                />
              </View>
            </View>
          ) : null}
          {Platform.OS === 'web' ? (
            <View style={{ gap: Spacing.two }}>
              <Txt variant="caption" muted>
                {s.reminderWebNote}
              </Txt>
              <Button
                variant="secondary"
                icon="logo-google"
                title={s.addToGoogleCalendar}
                onPress={() =>
                  Linking.openURL(
                    googleCalendarUrl({
                      hour: settings.reminderHour,
                      minute: settings.reminderMinute,
                      // no name in the link: it goes to Google
                      title: s.reminderTitle(''),
                      body: pickForDay(s.reminders, todayStr()),
                    }),
                  )
                }
              />
              <Button
                variant="ghost"
                icon="calendar-outline"
                title={s.downloadCalendar}
                onPress={() =>
                  downloadIcs(
                    buildIcs({
                      hour: settings.reminderHour,
                      minute: settings.reminderMinute,
                      title: s.reminderTitle(settings.name.trim()),
                      bodies: s.reminders,
                    }),
                  )
                }
              />
            </View>
          ) : null}
        </Card>
      </Section>

      {aiAvailable() ? (
        <Section title={s.aiSettingsTitle}>
          <Card>
            <Txt variant="caption" muted>
              {s.aiSettingsHint}
            </Txt>
            <Input
              value={aiCode}
              onChangeText={setAiCode}
              onBlur={() => updateSettings({ aiCode: aiCode.trim() })}
              placeholder={s.aiCodePlaceholder}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Card>
        </Section>
      ) : null}

      <Card>
        {row(
          s.sound,
          <Switch value={settings.sound} onValueChange={(v) => updateSettings({ sound: v })} trackColor={{ true: c.primary }} />,
        )}
      </Card>

      <Section title={s.howItWorks}>
        <Card tone="primary">
          <Row align="flex-start">
            <IconBadge icon="leaf-outline" size={36} />
            <Txt style={{ flex: 1 }}>{s.howItWorksBody}</Txt>
          </Row>
        </Card>
      </Section>
    </Screen>
  );
}
