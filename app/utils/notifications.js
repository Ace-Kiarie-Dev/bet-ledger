// app/utils/notifications.js
//
// PARKED — not wired into the app for v1. Nothing in app/ imports from this
// file. Kept (not deleted) for the FCM + Cloud Function rebuild — same
// treatment as functions/ (see docs/sessions/DECISIONS.md, "Account deletion
// via Cloud Function" and "Notifications removed from v1").
//
// Why parked: on-device testing (Tecno Camon 30S, Android 15, HiOS) showed
// local scheduling via expo-notifications is not reliable in the background
// on the dominant hardware in BetLedger's target market — likely a mix of
// Android 12+ exact-alarm permission requirements and Transsion's battery
// management. The kickoff reminder (removed earlier this session) fired only
// on app reopen; the settle digest (below) didn't fire at all. See
// docs/sessions/DECISIONS.md for full detail — do not re-wire this file's
// local-scheduling functions (scheduleBetReminders, scheduleStreakAlerts,
// schedulePerformanceUpdates, scheduleSettleDigest, and their cancel/
// counterparts) without solving that problem first; they're left as-is here
// as a reference for what NOT to repeat, not as verified-working code.
//
// What IS still reusable as-is: the permission-status helpers
// (hasRequestedNotificationPermission, getNotificationPermissionStatus,
// hasNotificationPermission, requestNotificationPermission) — permission
// request/tracking works the same regardless of local vs. push delivery, and
// an FCM-based rebuild will still need to know whether the user has granted
// notification permission at all.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const SETTLE_DIGEST_ID = 'settle-digest';

// ─── Permission status ───
// Persisted so the app can tell "never asked" apart from "asked and denied"
// across cold starts, without re-prompting on every launch (iOS in particular
// won't show the native dialog again after a denial — requestPermissionsAsync
// just silently returns 'denied' — so we need our own record to react to that
// instead of assuming a prompt happened).
const PERMISSION_STATUS_KEY = '@betledger/notificationPermissionStatus';

async function persistPermissionStatus(status) {
  await AsyncStorage.setItem(PERMISSION_STATUS_KEY, status).catch(() => {});
  return status;
}

// True only if we've previously recorded a real OS decision (granted or
// denied) for this device — used to decide whether the app should auto-prompt.
export async function hasRequestedNotificationPermission() {
  const stored = await AsyncStorage.getItem(PERMISSION_STATUS_KEY).catch(() => null);
  return stored != null;
}

// Live OS status (also refreshes the persisted record as a side effect, so it
// self-heals if the user grants/revokes via system settings behind our back).
export async function getNotificationPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  await persistPermissionStatus(status);
  return status;
}

export async function hasNotificationPermission() {
  const status = await getNotificationPermissionStatus();
  return status === 'granted';
}

// Actually shows the OS prompt if not yet decided. Call this at a moment the
// user has context for (first authenticated screen, or an explicit toggle
// flip in Settings) — not on cold start before they know what the app is.
export async function requestNotificationPermission() {
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
  await persistPermissionStatus(finalStatus);
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

// ─── Settle Digest ───
// UPDATE: confirmed broken on-device, not just theoretically at risk — see
// the PARKED note at the top of this file. This section originally flagged
// an *open question* about whether this digest (same DATE-trigger mechanism
// as the removed kickoff reminder) would share its background-delivery
// failure. It was tested: the digest did not fire at all — not in the
// background, not on reopen (worse than the kickoff reminder, which at least
// fired on reopen). That result is why the whole notifications surface was
// pulled from v1 rather than just the kickoff reminder. Left below as-is,
// unfixed, for the FCM rebuild to reference — see docs/sessions/DECISIONS.md.
//
// Original design notes, still accurate as *intent*, just not as a working
// feature: generic "you have bets to settle" nudge at 9am local time,
// deliberately not needing exact timing (9am vs 9:40am is immaterial for
// this copy) — which is why it was suspected, wrongly as it turned out, that
// it might survive where the exact-time kickoff reminder didn't.
//
// Recomputing "next 9am" fresh from the device's current local time on every
// call (rather than storing a fixed instant) is what makes this survive a
// timezone change *the next time the app reconciles* — see
// reconcileNotifications in notificationSync.js, which is what actually
// drives rescheduling. A timezone change that happens while the app is
// backgrounded and never reopened before the old-timezone-equivalent instant
// fires is not covered (no background task computes that); the next
// foreground reconcile corrects it going forward. Flagged in DECISIONS.md.
function getNextNineAmLocal(from = new Date()) {
  const target = new Date(from);
  target.setHours(9, 0, 0, 0);
  if (target.getTime() <= from.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

export async function scheduleSettleDigest() {
  await Notifications.cancelScheduledNotificationAsync(SETTLE_DIGEST_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: SETTLE_DIGEST_ID,
    content: {
      title: 'You have bets to settle',
      body: 'Open BetLedger to update your pending bets.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: getNextNineAmLocal() },
  });
}

export async function cancelSettleDigest() {
  await Notifications.cancelScheduledNotificationAsync(SETTLE_DIGEST_ID).catch(() => {});
}
