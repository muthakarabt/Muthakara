import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'daily-reminder';

/**
 * Schedules one reminder a day at the chosen time, with a different encouraging
 * message for each weekday. Returns false when the user did not allow notifications.
 */
export async function scheduleDailyReminder(opts: {
  hour: number;
  minute: number;
  title: string;
  bodies: string[];
}): Promise<boolean> {
  if (Platform.OS === 'web' || !opts.bodies.length) return false;
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily reminder',
      importance: AndroidImportance.DEFAULT,
    });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (let weekday = 1; weekday <= 7; weekday++) {
    await Notifications.scheduleNotificationAsync({
      content: { title: opts.title, body: opts.bodies[(weekday - 1) % opts.bodies.length] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: opts.hour,
        minute: opts.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
  return true;
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
