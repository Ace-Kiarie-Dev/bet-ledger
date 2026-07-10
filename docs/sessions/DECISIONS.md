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
