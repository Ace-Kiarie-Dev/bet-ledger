# Session 7 — Recovery, rebuild, and end-to-end auth

**Date:** 2026-07-09
**Duration:** ~6 hours
**Goal going in:** Figure out what was salvageable from the catastrophic laptop failure and rebuild BetLedger from whatever survived.

---

## What actually happened

Started this session in a worse spot than I realized. The old laptop was gone, and what I *thought* I had was a working project — turned out to be a ZIP-download of the GitHub repo (`bet-ledger-main`) with no `.git` folder, no `node_modules`, no dependencies installed, and — critically — only 3 commits ever pushed. The last real push had been "Dependencies and onBoarding.js first look," which meant Sessions 2 through 8 of prior work (all the polished screens, Session 8 dev-client build, working Google Sign-In) had never been committed. It was all gone. The whole "rebuild" premise of the session held.

The pivot was accepting that we weren't recovering old code — we were rebuilding from a solid foundation with better git discipline this time. Cloned a fresh `bet-ledger-repo`, installed and version-aligned all dependencies to SDK 55, fixed `app.json` (dark theme, bundle ID, EAS project linked), fixed `firebase.js` (AsyncStorage persistence), and committed each of these as a checkpoint before touching any screen code. Every commit went to GitHub before moving to the next step. This alone would have made tonight worthwhile.

From there, the actual rebuild: I ran design work through Stitch (Google's UI generator) to get high-fidelity mockups for Onboarding and Auth before touching code, then Claude Code (via Antigravity IDE) implemented against those mockups. Onboarding came out beautiful — 3 slides matching the "Analytical Athleticism" design language, floating card animations, gold accent words, teal wave transitions. Dashboard rebuilt with active + empty states, real Firestore integration, KES currency. AuthScreen followed the same pattern. Google Sign-In took roughly an hour of debugging alone — the error path went `DEVELOPER_ERROR` (missing SHA-1) → `DEVELOPER_ERROR` again (SHA-1 was there but Firebase had no Android OAuth client at all) → `auth/operation-not-allowed` (Google provider disabled in Firebase Auth). Fixed all three, sign-in finally worked end-to-end, and the app greeted me as "Musikal Peter" from my real Google account.

Ended the session with everything committed and pushed. Nothing lives only on this machine.

---

## What got done

- Fresh git-tracked clone of `bet-ledger-repo` from GitHub (replacing the untracked ZIP-download folder)
- All dependencies installed, version-aligned to SDK 55, `expo-doctor` clean at 19/19 — commit `8fe616e`
- `app.json` fixed (dark theme, bundle ID `com.nesture.betledger`, EAS project linked via `399dc02e-cfac-4f2d-8cb7-37e747b6ad64`, notifications plugin configured) + `firebase.js` fixed (AsyncStorage persistence via `initializeAuth`) — commit `4b3bde2`
- `app.json` slug case fix (`BetLedger` → `betledger`) + auto-generated `eas.json` — commit after that
- Full Session 7 rebuild in one commit: `DashboardScreen` (active + empty states, KES currency, ROI, streaks, personalized greeting), `OnboardingScreen` (3 polished slides with animations), `storage.js` (with `getBets`, `addBet`, `updateBet`, `deleteBet`, `getStats`, refactored `createUserProfile(user)`), profile path moved to `profile/data` — commit `a1c55f9`
- `AuthScreen` with real Google Sign-In end-to-end
- Dashboard empty-state polish (subtle greeting, right-sized ghost text and CTA button)
- Firebase Console: added SHA-1 fingerprint to Android app config
- Google Cloud Console: created Android OAuth 2.0 Client ID (name: `BetLedger Android`, package: `com.nesture.betledger`, SHA-1: `3C:AC:2D:50:73:2A:9B:F6:EB:2E:E4:C3:95:3B:E4:69:11:A0:DE:55`)
- Firebase Auth: enabled Google as a sign-in provider
- Working EAS development build APK installed on phone (this was actually completed and installed during the session, but was originally built pre-crash)

---

## What broke and how it got fixed

**Problem:** `npx create-expo-app` refused to run because the existing folder wasn't empty.
**Root cause:** The `bet-ledger-main` folder was a ZIP-download of a GitHub repo, not a scaffold — had a `.gitignore`, `README.md`, and some assets already.
**Fix:** Cloned properly with `git clone` into a separate `bet-ledger-repo` folder instead of trying to scaffold on top.
**Lesson:** GitHub ZIP-downloads look like project folders but have no `.git` — always clone properly, always confirm `.git` exists before assuming git history is available.

**Problem:** Ran `npx expo install` before running base `npm install`, got `ConfigError: Cannot determine the project's Expo SDK version because the module 'expo' is not installed.`
**Root cause:** Trying to install SDK-aligned packages before Expo itself was installed. `expo install` needs to read the Expo package to know which SDK version to align other packages to.
**Fix:** Run `npm install` first (installs everything already in `package.json`), then `npx expo install <new packages>` for anything additional.
**Lesson:** For any fresh clone: `npm install` first, `npx expo install` second, `npx expo-doctor` third.

**Problem:** Claude Code writing files to the wrong folder — `bet-ledger-main` (the untracked ZIP-download) instead of `bet-ledger-repo` (the properly cloned one).
**Root cause:** Antigravity's workspace root was set to a different folder than where I'd been running Git Bash commands. Terminal path and IDE workspace path aren't the same thing.
**Fix:** Manually copied files across; then made sure Antigravity had the correct project folder open before doing more Claude Code work.
**Lesson:** Before every Claude Code session, verify which folder is set as the IDE's workspace. Terminal PWD is not authoritative.

**Problem:** `FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined (found in field username)`
**Root cause:** `DashboardScreen.js` was calling `createUserProfile(user.uid, fallbackUsername, user.phoneNumber || '')` — three positional args — but `createUserProfile` in `storage.js` has the signature `createUserProfile(userId, { username })`, taking an options object as the second arg. Destructuring `{ username }` off a plain string yielded `username: undefined`, which Firestore rejects.
**Fix:** Refactored `createUserProfile` to accept the full Firebase user object directly: `createUserProfile(user)`, deriving the username internally via the priority chain `user.displayName → user.email prefix → user.phoneNumber → 'Player'`. Both AuthScreen and DashboardScreen now call it the same way, sanitization in one place.
**Lesson:** When multiple screens need the same profile-creation logic, put it in the storage layer as a helper that accepts the raw user object. Don't have each caller reinvent the sanitization.

**Problem:** `TypeError: 0, _utilsStorage.getBets is not a function (it is undefined)`
**Root cause:** `DashboardScreen.js` imported `getBets` from `storage.js`, but `storage.js` only had `getUserProfile` and `createUserProfile`. Nothing else. The other CRUD helpers were assumed to exist but had never been written.
**Fix:** Added `getBets`, `addBet`, `updateBet`, `deleteBet`, `getStats` to `storage.js` in one pass.
**Lesson:** Before writing a screen that queries the storage layer, verify the storage helper it imports actually exists. `grep -n "export" app/utils/storage.js` is a 5-second sanity check.

**Problem:** Every dev-client sign-in attempt returned `DEVELOPER_ERROR` (code 10) from Google Sign-In.
**Root cause:** Not one thing but three, in sequence:
  1. No SHA-1 fingerprint registered in Firebase Console for the Android app
  2. Even after adding SHA-1, no Android OAuth 2.0 Client ID existed in Google Cloud Console — Firebase had auto-created a Web client but not an Android client
  3. Even after both were in place, Firebase Auth's Google sign-in provider was disabled entirely
**Fix:** Fixed all three sequentially. Getting the SHA-1: `eas credentials --platform android` → view existing keystore. Fingerprint was `3C:AC:2D:50:73:2A:9B:F6:EB:2E:E4:C3:95:3B:E4:69:11:A0:DE:55`. Added it to Firebase Android app config. Created Android OAuth client in Google Cloud Console with that same SHA-1 and package name `com.nesture.betledger`. Enabled Google provider in Firebase Auth → Sign-in method tab.
**Lesson:** Google Sign-In with Firebase has three separate config surfaces that all need to be aligned: (1) Firebase app config (SHA-1), (2) Google Cloud OAuth clients (both Web AND Android must exist), (3) Firebase Auth sign-in providers (must be explicitly enabled). Add temporary `console.log` of the full error in `catch` blocks — the surfaced friendly message hides the actual code.

**Problem:** EAS Build outage right when we needed a dev-client build.
**Root cause:** Genuine Expo infrastructure outage, unrelated to our project.
**Fix:** Waited. There was nothing to do.
**Lesson:** `status.expo.dev` is worth bookmarking. Not every error is your fault.

---

## What's left

**Next session priority:**
1. **AddBetScreen** — the "log a bet" flow. This is the screen that turns the app from "pretty dashboard" into "actually useful." Should include sport picker, teams input, stake, odds, outcome (win/loss/pending), date. Design: same Analytical Athleticism system.
2. **SettingsScreen** — needed to replace the temporary `SIGN OUT` debug button on Dashboard. Real sign-out, weekly budget setter, quit-mode toggle, account info.
3. **HistoryScreen** — list of all logged bets with filters. Once AddBet works, this is what visualizes the data.

**Backlog / eventually:**
- Update `CLAUDE.md` to reflect new schema — `profile/data` path (not `meta/profile`) and refactored `createUserProfile(user)` signature. Currently CLAUDE.md is stale.
- Add missing `TYPE.bodyLg` token to `app/constants/typography.js` — AuthScreen worked around its absence with inline styles.
- Firestore security rules. Nothing enforces per-user isolation yet. Must be done before public launch.
- Add production keystore SHA-1 to Firebase/Google Cloud when we do `eas build --profile production`. Production uses a different keystore than development.
- SplashScreen, LeaderboardScreen, AboutScreen, InsightsScreen — all still 23-line placeholders.
- Strip the `SIGN OUT` debug button and `emptyHeaderRow` from Dashboard once SettingsScreen ships a real sign-out. Marked `// TODO: Remove once SettingsScreen has a real sign-out — Session 8`.
- Adaptive icon background color in `app.json` still `#E6F4FE` (leftover from scaffold) — should probably be `#061423` to match the base.

---

## Decisions worth remembering

- **Firestore profile path:** moved from `users/{uid}/meta/profile` to `users/{uid}/profile/data` for consistency with `stats/data`. Old `meta/profile` documents in Firestore are orphaned but harmless.
- **`createUserProfile` signature:** takes the full Firebase user object, not `(uid, { username })`. Sanitization lives in one place.
- **Design system name:** "Analytical Athleticism" (from the Stitch-generated `DESIGN.md`). Codified: teal `#42DEC3` for wins/CTAs, gold `#FFB955` for pending/caution, coral `#FFB5B2` for losses. Manrope for headlines, Inter for body. Barlow reserved for financials (installed but not yet used). Pill-shaped everything.
- **Design flow:** Stitch first (get high-fidelity mockup), then Claude Code implements against the mockup. Don't skip the Stitch step — the "spice up the onboarding" moment was the difference between the bland original and the polished result.

---

## Notes to future me

- The `SIGN OUT` button on Dashboard is throwaway. Don't leave it in production. It's marked with a TODO.
- Debug logging block in `AuthScreen.js` was already stripped after Google Sign-In verified.
- The Expo dev-client shows a floating gear icon on every screen — that's Expo's dev menu, not our UI. Ignore it.
- Onboarding Slide 1 (bet slip card, "Track every bet. Honestly.") is the strongest of the three. If we ever need to cut down onboarding, keep Slide 1 as the hero.
- Google Sign-In fails silently in Expo Go on this project — the native module isn't in Expo Go's binary. Always test on the dev-client APK.
- `eas.json` was auto-generated by `eas build` and turned out fine (development profile has `developmentClient: true`, `distribution: internal` — exactly what we want). Don't mess with it unless a new profile is needed.
- CLAUDE.md is stale on the schema section — trust `PROJECT_STATE.md` over CLAUDE.md until CLAUDE.md is updated.
- Peter's git username/email is now set globally — first-run friction resolved.
- Windows/Git Bash generates LF/CRLF warnings on commit. They're harmless. Ignore.
- Do the "spice up the onboarding" thing again for AddBet — Stitch it first before Claude Code implements.
