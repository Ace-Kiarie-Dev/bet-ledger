# BetLedger — Project State

**Last updated:** 2026-07-09 (end of Session 7)
**Latest commit on `main`:** [check `git log -1` — the Dashboard polish commit that concluded Session 7]

This is a living document. Update it at the end of every session. Its job is to answer: "if a new person (or a returning me) opened this repo today, what's actually built, what's not, and what's the current shape?"

---

## What is BetLedger

An Expo (managed) React Native app for Kenyan sports bettors to log their bets honestly and see real stats — wins, losses, streaks, budget adherence. Deliberately **not** a betting app or a tipster app. It doesn't predict, it doesn't give picks. It's a personal ledger and honesty tool.

Target market: Kenya (KES currency, betting is enormous locally). Region-responsive currency is planned but not built.

---

## Architecture at a glance

**Stack:**
- Expo SDK 55, React 19.2, React Native 0.83.6
- Firebase Auth + Firestore (JS SDK, no native Firebase plugin)
- React Navigation 7 (native-stack + bottom-tabs)
- Fonts: Manrope (headlines), Inter (body), Barlow (financials — installed, not yet used)
- Animations: Reanimated 3, Framer Motion via Animated API
- Charts: victory-native + react-native-skia
- Google Sign-In: `@react-native-google-signin/google-signin` (requires dev-client, not Expo Go)

**Design system:** "Analytical Athleticism." Dark navy base (`#061423`), teal primary (`#42DEC3` → `#00C2A8` gradient), gold secondary (`#FFB955`), coral tertiary (`#FFB5B2`). Pill-shaped everything. Tonal layering over drop shadows. Full tokens live in `app/constants/`.

**Auth:** Google Sign-In only. No email/password, no phone auth. Auto-creates a Firestore profile document on first sign-in.

**Persistence:** Everything in Firestore, no local database. Auth state persisted to AsyncStorage so sign-in survives app restarts.

**No backend server.** The app talks directly to Firebase. Security is (or will be) enforced by Firestore security rules — currently no rules are enforcing per-user isolation, this is high-priority tech debt.

---

## Firestore schema

```
users/{userId}/
  profile/data          — { username, joinedAt, quitModeOn, weeklyBudget }
  bets/{betId}          — { sport, teams, stake, odds, outcome, date, createdAt }
  stats/data            — { currentCleanStreak, longestCleanStreak, budgetAdherenceStreak }

leaderboard/                (not yet implemented)
  cleanStreak/{userId}    — { username, streak, updatedAt }
  budgetStreak/{userId}   — { username, streak, updatedAt }
```

**Note:** the profile path was originally `users/{userId}/meta/profile` in CLAUDE.md but moved to `profile/data` in Session 7. CLAUDE.md is stale on this. Trust this document.

---

## Screen inventory

| Screen | State | Notes |
|---|---|---|
| `OnboardingScreen.js` | ✅ Built (Session 7) | 3 polished slides with floating card animations, animated pagination, gold-accented headlines |
| `AuthScreen.js` | ✅ Built (Session 7) | Google Sign-In working end-to-end, wave transition hero, "Bet Ledger" wordmark |
| `DashboardScreen.js` | ✅ Built (Session 7) | Active + empty states, subtle personalized greeting, Net P&L card, Win Rate, Loss Streak, Weekly Budget, Recent Bets, "Log a Bet" CTA. Has a temporary `SIGN OUT` debug button pending SettingsScreen. |
| `AddBetScreen.js` | ❌ Placeholder (23 lines) | Next session priority. Sport picker, teams, stake, odds, outcome selection. |
| `HistoryScreen.js` | ❌ Placeholder | List of all bets, filters |
| `InsightsScreen.js` | ❌ Placeholder | Charts (victory-native), streak visualizations |
| `SettingsScreen.js` | ❌ Placeholder | Real sign-out (replaces debug button), weekly budget setter, quit-mode toggle |
| `SplashScreen.js` | ❌ Placeholder | Currently unused — not wired into navigator |
| `LeaderboardScreen.js` | ❌ Placeholder | Unwired — planned as friends-only leaderboards for clean streaks |
| `AboutScreen.js` | ❌ Placeholder | Unwired — app info, credits |

---

## Non-screen code inventory

| File | State | Notes |
|---|---|---|
| `App.js` | ✅ Loads fonts, configures GoogleSignin, renders AppNavigator |
| `app/firebase.js` | ✅ Firebase initialized with AsyncStorage persistence |
| `app/navigation/AppNavigator.js` | ✅ Root stack with auth gate, 5-tab bottom nav, animated tab bar |
| `app/constants/colors.js` | ✅ Full palette (surfaces, brand, text, semantic) |
| `app/constants/typography.js` | ✅ FONTS + TYPE — missing `TYPE.bodyLg`, AuthScreen worked around it inline |
| `app/constants/index.js` | ✅ Exports COLORS, TYPE, SPACING, RADIUS, SHADOW |
| `app/utils/storage.js` | ✅ `getUserProfile`, `createUserProfile(user)`, `getBets`, `addBet`, `updateBet`, `deleteBet`, `getStats` |

---

## Infrastructure state

**GitHub:** `github.com/Ace-Kiarie-Dev/bet-ledger` — `main` branch, real commit history, `bet-ledger-repo` is the working folder.

**Firebase project:** `betledger-6345e`. Web SDK config in `app/firebase.js`. Android app registered as `com.nesture.betledger` with SHA-1 `3C:AC:2D:50:73:2A:9B:F6:EB:2E:E4:C3:95:3B:E4:69:11:A0:DE:55`. Google Sign-In provider enabled in Auth. Email/Password also enabled (unused).

**Google Cloud:** Web OAuth client `537494078170-tcaf...`, Android OAuth client `537494078170-i23q...` (created Session 7).

**EAS:** Project ID `399dc02e-cfac-4f2d-8cb7-37e747b6ad64`. Development build APK installed on the test phone. No production build yet.

**Dev machine:** Windows, Git Bash, Antigravity IDE, Claude Code via Antigravity.

---

## Known tech debt

- **Firestore security rules:** none. Must be added before public launch.
- **`SIGN OUT` debug button on Dashboard:** temporary, marked with TODO. Remove when SettingsScreen ships.
- **`CLAUDE.md` schema section is stale:** references old `meta/profile` path.
- **`TYPE.bodyLg` missing from typography.js:** AuthScreen inlined the style; add to tokens.
- **`app.json` adaptive icon background is `#E6F4FE`:** leftover from scaffold, should be `#061423`.
- **Currency hardcoded as KES:** structured for easy swap to a `formatCurrency(amount, region)` helper later, but the helper isn't built.
- **No production keystore SHA-1 registered:** will need to be added to Firebase/Google Cloud when `eas build --profile production` runs.

---

## Design references

- **`DESIGN.md`** (created via Stitch, at project root) — the "Analytical Athleticism" spec. Colors, typography, elevation, shapes, component rules.
- Stitch mockups (used for Onboarding + AuthScreen designs) — screenshots + HTML output archived in chat history; if needed for AddBet, re-generate via Stitch first before implementing.
