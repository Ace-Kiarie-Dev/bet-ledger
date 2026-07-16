// app/utils/notificationSync.js
//
// PARKED — not wired into the app for v1. Nothing in app/ imports from this
// file. Kept (not deleted) for the FCM + Cloud Function rebuild — see the
// PARKED note at the top of ./notifications.js and
// docs/sessions/DECISIONS.md ("Notifications removed from v1") for the full
// reasoning. On-device testing confirmed the settle digest this module
// reconciles never actually fired (not in the background, not on reopen),
// so this orchestration logic never worked end-to-end in production — left
// here as a reference for the reconcile-on-foreground-events *pattern*
// (still likely correct for the FCM version too: recompute from real
// Firestore state on app open/resume/bet-created/bet-settled rather than
// trusting incrementally-tracked state), not as verified-working code.
//
// Orchestration layer between Firestore state and expo-notifications
// scheduling. notifications.js stays a pure Expo wrapper with no Firestore
// knowledge; this module is where "what does the user's actual data say"
// meets "what should be scheduled."
import { getUserProfile, getBets } from './storage';
import { hasNotificationPermission, scheduleSettleDigest, cancelSettleDigest } from './notifications';

// Called on app open/foreground-resume and right after a bet is saved.
// Re-derives the settle digest from scratch every time rather than
// incrementally tracking it, so it can never drift from real Firestore state.
export async function reconcileNotifications(userId) {
  if (!userId) return;

  const permitted = await hasNotificationPermission().catch(() => false);
  if (!permitted) {
    await cancelSettleDigest().catch(() => {});
    return;
  }

  const profile = await getUserProfile(userId).catch(() => null);
  if (!profile?.notifications?.betReminders) {
    await cancelSettleDigest().catch(() => {});
    return;
  }

  const bets = await getBets(userId).catch(() => []);
  const hasPending = bets.some((bet) => bet.outcome === 'pending');

  if (hasPending) {
    await scheduleSettleDigest().catch(() => {});
  } else {
    await cancelSettleDigest().catch(() => {});
  }
}
