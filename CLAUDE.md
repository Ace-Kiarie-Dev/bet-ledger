# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start           # Start Expo dev server (scan QR with Expo Go)
npm run android     # Launch on Android emulator/device
npm run ios         # Launch on iOS simulator
npm run web         # Launch in browser
```

No test runner or linter is configured yet.

## Architecture

**BetLedger** is an Expo (managed workflow) React Native app for tracking sports bets, targeting Kenyan users. It rewards discipline — tracking losses and budget adherence — not just wins.

### Navigation (`app/navigation/AppNavigator.js`)

Two-level navigation:
- **Root Stack:** Splash → Onboarding → Auth → MainTabs (or overlay screens: Settings, About)
- **MainTabs (Bottom Tab):** Dashboard | Add Bet | History | Insights | Leaderboard

### State & Data

No Redux or Context API. All persistent state lives in **Firebase Firestore** — components query Firestore directly. Local `useState` is used only for forms and UI state.

Firebase exports (`app/firebase.js`): `auth` (email/password) and `db` (Firestore).

**Firestore schema:**
```
users/{userId}/
  profile:  { username, joinedAt, quitModeOn, weeklyBudget }
  bets/{betId}: { sport, teams, stake, odds, outcome, date, createdAt }
  stats:    { currentCleanStreak, longestCleanStreak, budgetAdherenceStreak }

leaderboard/
  cleanStreak/{userId}:   { username, streak, updatedAt }
  budgetStreak/{userId}:  { username, streak, updatedAt }
```

### Screens (`app/screens/`)

10 screens, currently empty scaffolds (as of Session 1/9 of the build plan):

| Screen | Purpose |
|--------|---------|
| SplashScreen | Auto-routes to Onboarding or Dashboard |
| OnboardingScreen | 3-slide intro |
| AuthScreen | Firebase email/password sign-up & login |
| DashboardScreen | Net P&L, win rate, loss streak, budget progress |
| AddBetScreen | Log a bet (sport, teams, stake KES, odds, outcome) |
| HistoryScreen | Timestamped bet records with filters |
| InsightsScreen | Bar/pie charts via Victory Native |
| LeaderboardScreen | Anonymous rankings (Clean Streak + Budget Adherence tabs) |
| SettingsScreen | Weekly budget, notifications, Quit Support mode |
| AboutScreen | Developer bio + social links |

`app/components/` and `app/utils/` are empty directories ready for shared components (BetCard, StatCard, AlertBanner) and utilities (calculations, notifications, storage helpers).

### Design System

| Token | Value |
|-------|-------|
| Background | `#1A1A2E` (deep charcoal) |
| Accent | `#F5A623` (gold) |
| Win | `#27AE60` (green) |
| Loss | `#E74C3C` (red) |
| Pending | `#95A5A6` (grey) |

Dark mode only. All screens use this palette.

### Key Dependencies

- `firebase ^12` — Auth + Firestore backend
- `@react-navigation/stack` + `@react-navigation/bottom-tabs` — navigation
- `victory-native ^41` — charts (Insights screen)
- `expo-notifications` — push notifications (FCM, planned but not yet wired)
