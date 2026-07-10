// app/utils/notifications.js
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const BET_REMINDER_ID = 'bet-reminders-daily';
const STREAK_ALERT_ID = 'streak-alerts-daily';
const PERFORMANCE_UPDATE_ID = 'performance-updates-weekly';

export async function registerForNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

// ─── Bet Reminders ───
// Daily nudge to settle any pending bets whose matches have already started.
export async function scheduleBetReminders() {
  await Notifications.cancelScheduledNotificationAsync(BET_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: BET_REMINDER_ID,
    content: {
      title: 'Got a result to log?',
      body: 'Update any pending bets so your stats stay accurate.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 0 },
  });
}

export async function cancelBetReminders() {
  await Notifications.cancelScheduledNotificationAsync(BET_REMINDER_ID).catch(() => {});
}

// One-off reminder tied to a specific bet's kickoff — scheduled by AddBetScreen
// when a bet is saved with a future matchTime and Bet Reminders are enabled.
export async function scheduleMatchReminder(bet) {
  const matchDate = new Date(bet.matchTime);
  if (Number.isNaN(matchDate.getTime()) || matchDate.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${bet.teams} has kicked off`,
      body: 'Log the result once it settles.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: matchDate },
  });
}

// ─── Streak Alerts ───
// Daily check-in nudge about the user's clean streak / budget adherence.
export async function scheduleStreakAlerts() {
  await Notifications.cancelScheduledNotificationAsync(STREAK_ALERT_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_ALERT_ID,
    content: {
      title: 'Keep your streak alive',
      body: 'Check in on your clean streak and budget adherence today.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 },
  });
}

export async function cancelStreakAlerts() {
  await Notifications.cancelScheduledNotificationAsync(STREAK_ALERT_ID).catch(() => {});
}

// ─── Performance Updates ───
// Weekly (Monday 9am) digest nudge. Weekdays are 1-7 starting Sunday, so 2 = Monday.
export async function schedulePerformanceUpdates() {
  await Notifications.cancelScheduledNotificationAsync(PERFORMANCE_UPDATE_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: PERFORMANCE_UPDATE_ID,
    content: {
      title: 'Your week in review',
      body: 'See your win rate, net P&L, and budget adherence for the week.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 9, minute: 0 },
  });
}

export async function cancelPerformanceUpdates() {
  await Notifications.cancelScheduledNotificationAsync(PERFORMANCE_UPDATE_ID).catch(() => {});
}
