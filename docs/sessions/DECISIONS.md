# Decisions Log

Append-only. Never edit past entries. If a decision gets reversed later, add a new entry that supersedes the old one — don't rewrite the old one.

Purpose: remember *why* the architecture is the way it is, so we don't relitigate old decisions or wonder later "why did we do it this way?"

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
