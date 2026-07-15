# Decisions Log

Append-only. Never edit past entries. If a decision gets reversed later, add a new entry that supersedes the old one — don't rewrite the old one.

Purpose: remember _why_ the architecture is the way it is, so we don't relitigate old decisions or wonder later "why did we do it this way?"

---

## 2026-07-09 — Google Sign-In only for auth

**Context:** BetLedger's original spec included phone auth and possibly email/password.
**Decision:** Google Sign-In is the only auth method. No email/password, no phone auth.
**Why:** Simpler UX for the Kenyan market (almost everyone has a Google account via Android), no password management burden, no OTP costs, works with Firebase's ID token exchange out of the box.
**Trade-off accepted:** Users without a Google account can't sign in. Deemed acceptable given target market.

---

## 2026-07-09 — Firestore profile path: `profile/data`, not `meta/profile`

**Context:** Original `CLAUDE.md` schema used `users/{uid}/meta/profile`. Session 7 rebuild questioned whether this was right.
**Decision:** Use `users/{uid}/profile/data` (sub-collection: profile, doc: data).
**Why:** Consistent with `stats/data`. Simpler mental model — every sub-thing under a user is `<collection>/data`. `meta` was doing no work.
**Migration status:** Any orphaned old `meta/profile` docs in production Firestore are harmless (nothing reads them).

---

## 2026-07-09 — `createUserProfile` accepts the full Firebase user object

**Context:** Session 7 discovered that `DashboardScreen` and (planned) `AuthScreen` were both going to need to auto-create profile documents. Original signature was `createUserProfile(uid, { username })`, requiring each caller to derive the username itself.
**Decision:** Signature is now `createUserProfile(user)` where `user` is the Firebase user object. The helper derives the username internally via priority chain: `user.displayName → user.email prefix → user.phoneNumber → 'Player'`.
**Why:** Sanitization lives in one place. Callers can't accidentally pass `undefined` and break Firestore. AuthScreen and DashboardScreen call it identically.

---

## 2026-07-09 — Design workflow: Stitch first, then Claude Code

**Context:** Session 7 initially tried to have Claude Code implement Onboarding from a text spec. The result was functional but bland — abstract bento cards that didn't say "betting tracker" specifically.
**Decision:** For every visually-significant screen going forward, generate a Stitch mockup first, iterate on the mockup, then hand the finalized design to Claude Code with pixel-level specs.
**Why:** Seeing the visual before implementation saves rework. Stitch generates real HTML/CSS we can point at and say "match this." Cheaper than iterating in-code.
**Applies to:** AddBet, History, Insights, Settings, Splash, Leaderboard, About. Not needed for pure logic screens (there aren't any planned).

---

## 2026-07-09 — Commit-and-push after every meaningful change

**Context:** Prior laptop crash wiped Sessions 2-8 of work because nothing had been committed to git — only the very first "scaffold" commit had made it to GitHub. Everything else lived only on the local machine.
**Decision:** Commit and push after every screen, every meaningful bug fix, every dependency change. Never let unpushed work exceed a single conceptual chunk.
**Why:** GitHub is the only real backup. `node_modules` doesn't matter. Uncommitted local work is at zero-day risk from hardware failure.
**Enforcement:** No new work starts until the previous chunk is on GitHub. Session recaps confirm push status.

## 2026-07-10 — Two-mode visual system: bold "Front Door" vs glass "Command Center"

**Context:** Full styling revamp run through Stitch across all 10 screens. Onboarding and Auth mockups came back using a bold, full-bleed teal gradient hero with an organic wave transition, while every other screen (Dashboard, Insights, History, Settings, etc.) used a consistent glass-on-navy treatment with no solid color blocking.
**Decision:** Keep both. Onboarding and Auth ("Mode A" — bold teal hero) get their own distinct first-impression visual language. Every other screen ("Mode B" — deep navy, glass surfaces, tonal layering) uses the calmer command-center treatment.
**Why:** A single bold, high-impact moment at the front door is more effective than diluting it across the whole app, while the in-app experience benefits from staying calm and analytical per the original "Analytical Athleticism" brief. Rule of thumb: pre-auth surfaces (Onboarding, Auth) = Mode A; everything post-auth = Mode B.

---

## 2026-07-10 — Onboarding and Auth screens locked as-is

**Context:** After the Mode A/B decision, Onboarding Slides 1–2 and Auth were mocked in Stitch and reviewed.
**Decision:** No further iteration on Onboarding or Auth. Implement as shown in the finalized mockups. Onboarding Slide 3 was never run through Stitch and is not being pursued further — implement Slides 1 & 2 as designed; extend the same visual pattern for Slide 3 at implementation time if a third slide is still wanted.
**Why:** These screens hit the mark on the first pass; further iteration wasn't adding value relative to moving the rest of the revamp forward.

---

## 2026-07-10 — AddBetScreen's `matchTime` picker temporarily stubbed

**Context:** `@react-native-community/datetimepicker` was added for AddBetScreen's match date/time field, but rebuilding the dev client to bake in the native module (`RNCDatePicker`) is being intentionally batched with other pending native changes rather than done immediately — until then, any screen that renders the real picker crashes on load with `TurboModuleRegistry.getEnforcing(...): 'RNCDatePicker' could not be found`.
**Decision:** In `AddBetScreen.js`, the native `<DateTimePicker>` render blocks and its open/onChange handlers are commented out (not deleted) behind `// TEMP: native DateTimePicker disabled until dev-client rebuild` markers. The match-time field is now an inert `TouchableOpacity` showing the current value as text; `matchTime` still defaults to `new Date()` on form load, so the win/loss outcome-lock logic (future vs. past `matchTime`) keeps working for testing everything else on the screen (chips, stake/odds, payout preview, save-to-Firestore).
**Why:** Unblocks visual/functional testing of the rest of AddBetScreen without doing a one-off dev-client rebuild ahead of schedule. The `@react-native-community/datetimepicker` package and its `app.json` config plugin are untouched — this is a rendering stub, not an uninstall.
**Follow-up required:** Once the batched dev-client rebuild lands, uncomment the real handlers/render blocks in `AddBetScreen.js` and delete the stub — do not ship the stub as final behavior.
**Follow-up (2026-07-11):** Restored ahead of the dev-client rebuild (rebuild was about to happen, so unblocking now rather than after). The real `DateTimePicker` import, `openPicker`/`onChangeDateTime` handlers, and both Android/iOS render blocks are back in `AddBetScreen.js`; the `TEMP` stub and its markers are deleted. `matchTime` and the `isPast` win/loss lock logic were verified to still work correctly with the real picker wired in.

---

## 2026-07-10 — Leaderboard: no cross-user data until Firestore rules + write-strategy are decided

**Context:** LeaderboardScreen was built with a full UI (podium, ranked list, tab switcher) but no real cross-user data exists yet. The `leaderboard/cleanStreak` and `leaderboard/budgetStreak` collections were never built, and no Firestore security rules exist governing per-user isolation — publishing a cross-user-readable leaderboard doc before rules exist is a real exposure risk, not just an incomplete feature.
**Decision:** Ship Leaderboard showing only the current user's own computed streak, with an honest "opens once more bettors join" placeholder for other rows. Do not write real cross-user leaderboard data until (1) Firestore security rules are written and published, and (2) a write-strategy is chosen: client-side write on every bet/outcome update (simple, write-amplifying, trusts the client) vs. a scheduled Cloud Function recompute (safer, adds staleness/infra).
**Status:** Open — write-strategy choice not yet made, tracked as next-session priority.

---

## 2026-07-11 — Notification reminders are unconditional, not state-aware (accepted v1 simplification)

**Context:** Bet Reminders (daily 8pm) and Streak Alerts (daily 9am) fire on a fixed schedule regardless of whether anything's actually pending or at risk — expo-notifications' local scheduling fixes content/trigger at schedule-time, so truly conditional notifications (checking real Firestore state when the notification would fire) require a background task (expo-task-manager) or server-side scheduling, which wasn't built.
**Decision:** Ship the unconditional version for v1. Revisit with a background-task or Cloud Function approach post-launch if it feels naggy in practice — Performance Updates (weekly) is a reasonable fit for unconditional scheduling either way since a weekly digest makes sense regardless of state, but Bet Reminders/Streak Alerts firing with nothing to actually report is worth watching.

---

## 2026-07-15 — Bell icon removed app-wide (dead affordance, pre-launch)

**Context:** The Type 1 header (logo + wordmark + bell + avatar) is reimplemented per-screen across Dashboard, History, Insights, and Leaderboard — no shared header component exists. AddBetScreen has a separate Type 2 header (back arrow, title, bell/spacer). The bell had no `onPress` handler anywhere in the app; tapping it did nothing on any of the five screens.
**Decision:** Remove the bell icon everywhere rather than ship a non-functional button:
- Dashboard, History, Insights, Leaderboard: bell `TouchableOpacity` and its `bellButton` style deleted outright (Insights had no avatar to balance against, so its header now just shows logo+wordmark; the other three keep the avatar, unaffected).
- AddBetScreen: the bell slot there was also acting as a right-side spacer balancing the back arrow so "LOG BET" stays centered (`headerRow` uses `space-between`). Replaced the bell `TouchableOpacity` with a plain invisible `headerSpacer` View of the same 32×32 size, rather than deleting it outright, so the title doesn't shift off-center.

Settings' notification toggles (Bet Reminders, Streak Alerts, Performance Updates) are untouched — those already work via `expo-notifications` local scheduling and are unrelated to this in-app bell affordance.
**Why:** A tappable icon that does nothing reads as broken, not "coming soon." Better to cut it and reintroduce it deliberately once there's a real feed behind it.
**Follow-up required:** An in-app notification feed (the bell's actual destination) is deferred to a post-launch build. When it's built, re-add the bell across all five headers — at that point, factoring the Type 1 header into a shared component is worth reconsidering instead of re-duplicating the bell four times, and AddBetScreen's spacer can go back to being a real button.

---

## 2026-07-15 — Account deletion via Cloud Function, not a Firestore rules carve-out

**Context:** BetLedger needs an account deletion path. The obvious client-side implementation — sign in, then run a batch of `deleteDoc` calls against `users/{uid}` and its subcollections directly from the app — was considered and rejected. `firestore.rules` currently locks settled bets against deletion (`allow delete: if isOwner(userId) && !isSettled(resource.data)`) by design, so a bet that's already been won or lost is a permanent record; that's the entire point of the "honest ledger" guarantee. A client-side deletion path would need a rules carve-out letting the owner delete settled bets too (at minimum for their own account-wipe case), which weakens that guarantee for any other write path that could piggyback on the same carve-out. This mirrors the earlier Leaderboard decision (see "Leaderboard: no cross-user data until Firestore rules + write-strategy are decided" above) — client-side writes/deletes get rejected whenever they'd require loosening rules that exist for a specific integrity reason, in favor of a server-side path that goes around rules entirely rather than through a hole in them.
**Decision:** Account deletion runs through a new callable Cloud Function, `deleteAccount` (`functions/index.js`, region `europe-west1` to match Firestore), using the Admin SDK. Admin SDK access bypasses Firestore rules by design, so `firestore.rules` needed zero changes — the outcome-lock rule stays exactly as-is for every other path into Firestore. The function verifies `context.auth` and uses `context.auth.uid` as the delete target; it never trusts a uid from the client payload. It walks `users/{uid}` and every subcollection under it via `listCollections()` (not a hardcoded `[bets, stats]` list, so a subcollection added in a future session isn't silently skipped) and deletes recursively in batches of 400.
**Deletion order:** Firestore data is wiped first, the Firebase Auth user is deleted last. If the Firestore wipe throws partway through, the Auth account is still alive and the user can just retry — the alternative order risks an Auth-deleted account with orphaned Firestore data that's no longer reachable by anyone (the uid that owned it no longer resolves to a signed-in session).
**Client side:** `app/utils/deleteAccount.js` re-authenticates via `GoogleSignin.signIn()` (Google Sign-In is the only auth method, per the 2026-07-09 decision above) before calling the function, since a stale session throws `auth/requires-recent-login`. On success it also calls `signOut(auth)` locally so the app routes back to Auth immediately rather than sitting on a signed-in screen for an account that no longer exists server-side.
**functions/ did not exist yet:** created it this session — `functions/index.js`, `functions/package.json` (`firebase-admin ^12.1.0`, `firebase-functions ^5.0.1`, Node 20), and added a `"functions": { "source": "functions" }` block to root `firebase.json` (not `firestore.rules` — a different file, needed so `firebase deploy --only functions` can find the source).
**Judgment call flagged:** the style guide has no documented "irreversible destructive action" button pattern beyond the `coral`/`COLORS.loss` token — the only precedent in code is the outlined pill used for Sign Out (Settings, Profile). Delete Account reuses `COLORS.loss` but as a **filled** pill (vs. Sign Out's outline) to visually rank it as more severe/less recoverable than signing out; text color reuses `COLORS.background` for contrast, following the same dark-on-light construction as `onPrimary` since no `onLoss`/`onCoral` token exists. Worth formalizing in the style guide if more destructive actions get added later.
**Still outstanding (not done this session):** a web-accessible account-deletion request page (can live on the privacy policy page — Play Store's Data Safety section requires this even though in-app deletion now exists), and deployment (`firebase deploy --only functions`) hasn't been run yet.

---

## 2026-07-15 — AuthScreen: two-path Google Sign-In (cached "Continue as X" + account switch)

**Context:** With Google Sign-In as the only auth method (see 2026-07-09 above), the native `@react-native-google-signin` layer caches the last-used account locally. `GoogleSignin.signIn()` reuses that cache silently when one exists, which is normally desirable (fast repeat sign-in) but meant there was no way for a user to switch to a different Google account — `signIn()` just kept returning the same cached one, with no picker ever appearing. Redesigned per an attached Stitch mockup (`assets/Sign Up Options.png`) to a two-path layout that fixes this.
**Decision:**
- On mount, `AuthScreen` checks `GoogleSignin.hasPreviousSignIn()` / `GoogleSignin.getCurrentUser()` (both synchronous native-cache reads, confirmed from the installed `@react-native-google-signin/google-signin` v16 source — no network call, no loading state needed).
- If a cached account exists: two equal-width pill buttons render side by side — left is "Continue as {name}" (silent re-auth via `GoogleSignin.signInSilently()`, no picker), right is a plain "Google" button.
- **The actual fix for "stuck on one account":** the right ("Google") button calls `GoogleSignin.signOut()` *first* to clear the native cache, *then* `GoogleSignin.signIn()`. Calling `signIn()` alone never surfaces the picker while a cached session exists — clearing the cache first is what forces it.
- If no cached account exists, only a single centered "Sign in with Google" button renders — no empty/disabled left button.
**Why this matters for Sign Out:** the native cache this screen depends on is only useful if Sign Out doesn't wipe it. **Confirmed** (not changed — no prior session had added it) that both Sign Out handlers (`SettingsScreen.js`, `ProfileScreen.js`) call only `signOut(auth)` — the Firebase sign-out — and never `GoogleSignin.signOut()`. If either had called `GoogleSignin.signOut()` on every sign-out, the native cache would be cleared every time and the "Continue as X" fast path would never have anything to show, defeating the point of this screen.
**Judgment calls flagged:**
- The mockup shows a "Skip" link top-left of the hero. Per explicit instruction this was omitted rather than added — AuthScreen had no Skip button before this change, and the instruction said not to add one back.
- After `GoogleSignin.signOut()` in the account-switch handler, `cachedUser` state is cleared immediately (before the picker even resolves) — so if the user cancels the picker, the screen correctly falls back to the single-button layout instead of showing a now-stale "Continue as X" for a session that no longer exists in the native cache.
- The cached-user label truncates by name first, then email (to 17 chars + ellipsis) if no display name is set, per spec; falls back to a generic "Continue" label in the (unexpected) case where the cached `User` object has neither.

---

## 2026-07-15 — Account deletion moved to client-side; `bets` delete-lock relaxed (supersedes part of the earlier 2026-07-15 Cloud Function entry)

**Context:** The `deleteAccount` Cloud Function (logged earlier today — "Account deletion via Cloud Function, not a Firestore rules carve-out") was written and correctly deployable in principle, but deployment was blocked: 2nd-gen Cloud Functions require the Blaze (pay-as-you-go) plan, and this project is on Spark. **Decision made this session: defer upgrading to Blaze entirely until a cross-user feature (the leaderboard) actually requires server-side enforcement.** Nothing about account deletion justifies a billing-plan change on its own.
**Decision:** Account deletion now runs fully client-side (`app/utils/deleteAccount.js`), through `firestore.rules` directly rather than around it via the Admin SDK. This required relaxing `firestore.rules`'s `bets` delete condition from `isOwner(userId) && !isSettled(resource.data)` to just `isOwner(userId)`. The **update** rule (which enforces the actual outcome-lock — settled bets can't have `outcome`/`stake`/`odds`/`market`/`selection` edited) is untouched and fully intact; only whole-record deletion was relaxed, and only so a user can delete their own entire account.
**The trade-off, stated plainly:** a modified client can now delete individual settled bets, not just whole accounts. It cannot edit a settled bet's outcome — that guarantee is unchanged. Someone could use a hacked client to selectively erase specific losing (or winning) bets from their own history while keeping others.
**Why this is acceptable right now:** there is no cross-user feature live. Leaderboard (see 2026-07-10 "no cross-user data until Firestore rules + write-strategy are decided") still only ever shows the current user their own computed streak — nobody else's integrity depends on any other user's data being tamper-proof. The only person a tampered delete could mislead is the tamperer themselves, viewing their own history.
**RE-TIGHTENING TRIGGER (explicit):** before ANY cross-user feature ships — the leaderboard going live with real cross-user data, verified badges, or anything else where one user's data integrity is trusted by another user or by the app on their behalf — the `bets` delete rule must be restored to `isOwner(userId) && !isSettled(resource.data)`, and account deletion must move back to the parked Cloud Function (`functions/index.js` — left in place, unwired, with a comment marking it parked for exactly this).
**Data-trust caveat:** any bet created or deleted while the delete-lock is loose is unverifiable for future cross-user purposes — there's no way to retroactively prove a given user's historical bet list wasn't selectively edited during this window. When the leaderboard is built, clean-streak/budget-streak computations should count from the re-tightening date forward, not from account creation, for any account that existed during the loose-rules period.
**Implementation notes:**
- The client SDK has no `listCollections()` (Admin-only), so `app/utils/deleteAccount.js` hardcodes the two subcollections the app actually writes — `profile` and `bets` — derived from `app/utils/storage.js`, with a comment marking it as the place to update when a new subcollection is added. `stats` is excluded: it has no client-side writer (`getStats` has no matching setter) and `firestore.rules` blocks all writes to it (`allow write: if false`) regardless.
- There is no top-level `users/{uid}` document to delete — nothing ever writes one directly (profile data lives at `users/{uid}/profile/data`), and `firestore.rules` grants no access to that bare path (it falls through to the deny-all catch-all). Deletion is scoped to subcollection contents only.
- Deletion order unchanged from the Cloud Function version: Firestore data first, Auth user (`deleteUser(auth.currentUser)`) last, so a failed Firestore wipe leaves a live, retryable Auth account rather than an orphaned one. Retries are safe — deleting an already-empty subcollection is a no-op.
- `SettingsScreen.js` required zero changes — verified, not assumed: `deleteAccount`'s export name, call signature, and generic `err.message` error handling are all unchanged.
- Deployed: `firebase deploy --only firestore:rules` (works on Spark — only Functions requires Blaze). **Still needed: on-device verification** — sign in with a test account that has settled bets, run Delete Account from Settings, confirm the full wipe succeeds and the app routes back to Auth.
- **Follow-up fix (same day):** the success path of `deleteAccount()` now also calls `GoogleSignin.signOut()` (after `deleteUser()` succeeds, alongside `signOut(auth)`), clearing the native Google session cache. Without this, AuthScreen would still offer "Continue as {deleted user}" after a deliberate deletion, silently re-registering a new account under the stale cached identity on tap. Regular Sign Out is intentionally unchanged — it still preserves the native cache for the "Continue as X" fast path (see the AuthScreen two-path decision above); only account deletion clears it.
