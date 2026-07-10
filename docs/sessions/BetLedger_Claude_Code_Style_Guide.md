# Bet Ledger — Claude Code Style Guide

**Purpose:** This is the canonical reference for implementing the visual revamp in React Native.
It reconciles the Stitch mockups (which vary slightly screen to screen) into one consistent
system. When a Stitch screenshot conflicts with this doc, this doc wins.

Source of truth for brand voice/positioning: `DESIGN.md` ("Analytical Athleticism"). This file
is the implementation-level companion to it — more specific, more opinionated where Stitch
outputs disagreed with each other.

---

## 1. Two Visual Modes

The app deliberately runs **two related but distinct visual treatments**:

### Mode A — "Front Door" (Onboarding, Auth)
Bold, full-bleed teal gradient hero block (top ~50–55% of screen), organic wave transition
into navy below. High-contrast, high-impact first impression. Solid color blocking is
intentional here and nowhere else.

- Gradient: `#42DEC3 → #00C2A8`, 135deg
- Organic asymmetric wave SVG divider between hero and content zone
- Content zone below the wave: navy `#061423`, standard typography
- This is the ONE place in the app that uses solid gradient blocking instead of glass

### Mode B — "Command Center" (everything else)
Deep navy base throughout, glass surfaces, tonal layering, subtle topographic texture. No
solid color blocks. This is Dashboard, Insights, History, AddBet, Settings, Leaderboard,
About, Splash, and all modals/bottom sheets.

- Base: `#061423`
- Glass card: `rgba(15, 28, 44, 0.6)` background, `backdrop-filter: blur(12px)`, no heavy border
- Depth via brightness/translucency layering, not shadows

**Rule of thumb:** if the user is *inside* the app (post-auth), it's Mode B. The only Mode A
surfaces are the ones a user sees before they've signed in, plus the 3 onboarding slides.

---

## 2. Color Tokens (canonical — reconcile all Stitch variants to these)

```js
// app/constants/colors.js — canonical values
export const COLORS = {
  // Base
  background: '#061423',
  surfaceDim: '#061423',
  surfaceContainerLowest: '#020F1E',
  surfaceContainerLow: '#0F1C2C',
  surfaceContainer: '#132030',
  surfaceContainerHigh: '#1E2B3B',
  surfaceContainerHighest: '#293646',
  surfaceBright: '#2D3A4B',

  // Text
  onSurface: '#D6E4F9',        // "Ice White" — primary text
  onSurfaceVariant: '#BBCAC5', // secondary/muted text
  outline: '#85948F',
  outlineVariant: '#3C4A46',

  // Brand
  primary: '#66FBDF',          // bright teal — icons, active states
  primaryContainer: '#42DEC3', // teal — CTAs, gradients (paired with #00C2A8)
  onPrimary: '#00382F',
  secondary: '#FFB955',        // gold — pending, streaks, budget/caution
  secondaryContainer: '#A16900',
  onSecondary: '#452B00',

  // Loss / warning — CANONICAL, use everywhere (do not use Material 'error' token)
  coral: '#FFB5B2',
  onCoral: '#690005',
  coralContainer: '#93000A',
};
```

**Fix required:** several Stitch exports default to Material's `error` (`#FFB4AB`) for loss
states instead of the brand coral (`#FFB5B2`). These are close but not the same color —
replace every `error`/`on-error`/`error-container` usage that represents a **loss/negative**
with the `coral` tokens above. Reserve true `error` (if ever needed) for actual system errors,
not betting losses.

---

## 3. Typography

```js
// app/constants/typography.js
export const FONTS = {
  headline: 'Manrope',        // h1, h2, labels, wordmark
  body: 'Inter',              // body copy, inputs, list text
  display: 'Barlow_800ExtraBold', // ALL financial figures — see rule below
};
```

**Fix required:** `Barlow_800ExtraBold` is already installed (per Session 7) but is only
referenced inline in 1–2 Stitch screens and isn't imported via the web font link in most
exports. Every `data-display` typographic role — P&L figures, stake/odds/payout numbers,
streak counts, leaderboard streak numbers, ROI figures — must render in Barlow, not Manrope.
Manrope stays reserved for headlines (`h1`, `h2`) and the wordmark only.

| Role | Font | Size | Weight |
|---|---|---|---|
| `h1` | Manrope | 40px (32px mobile) | 800 |
| `h2` | Manrope | 24px | 700 |
| `body-lg` | Inter | 18px | 400 |
| `body-md` | Inter | 16px | 400 |
| `label-caps` | Inter | 12px, +0.08em tracking | 600 |
| `data-display` | **Barlow ExtraBold** | 20px+ (scales up for hero figures) | 800 |

---

## 4. Wordmark

**Canonical treatment: `BET LEDGER`** — all caps, tight/negative letter tracking, Manrope
Extrabold, teal (`primary`). Several Stitch exports use title-case `Bet Ledger` instead
(Dashboard active state, About) — standardize all of these to the all-caps lockup.

Logo mark (small icon, left of wordmark) stays as-is from the existing app asset.

---

## 5. Header Pattern (standardize — currently inconsistent across screens)

Two header types only. Every screen uses one of these two, no variations:

### Type 1 — Tab-root screens
(Dashboard, Insights/Analytics, History, Leaderboard)
```
[logo mark] BET LEDGER                    [bell icon]  [avatar circle]
```
Always all four elements, always in this order, always this spacing.

### Type 2 — Sub-pages
(AddBet, Settings, About, Outcome Update sheet)
```
[← back arrow]        SCREEN TITLE        [bell icon or spacer]
```
Centered or left-aligned title per existing Stitch pattern is fine — just be consistent about
which, once decided. Back arrow always present, always top-left, always the same tap target.

**Fix required:** HistoryScreen's Stitch export currently overlaps a lowercase "history" label
with the "BET LEDGER" wordmark — this reads as a rendering artifact, not an intentional design.
Replace with standard Type 1 header (History is a tab-root screen).

---

## 6. Bottom Navigation (must be pixel-identical everywhere it appears)

One component, reused everywhere — Dashboard, Insights, History, Leaderboard, AddBet all
show this same bar:

- Floating glass pill: `rgba(19, 32, 48, 0.6)` background, `backdrop-filter: blur(20px)`,
  positioned `fixed bottom-4/6`, rounded-full, subtle shadow
- 5 icons: Home, Scan/Add, Analytics, History, Account
- Active icon: teal (`primary`) with a soft `primary/10` or `primary/20` rounded background
  chip behind it (not just a color change — the filled chip matters for the "active" affordance)
- Inactive icons: `onSurfaceVariant`, no background

**Fix required:** AddBetScreen's Stitch export renders bare icons with no glass pill container
at all — breaks the pattern. Rebuild it to use the same nav component as every other screen.

---

## 7. Shape & Elevation

- Border radius: `1rem` default, `2rem` for large cards (`lg`), `3rem` for hero elements (`xl`),
  `9999px` (full) for all buttons/chips/pills
- No 1px hard borders — glass cards use `rgba(255,255,255,0.05–0.1)` hairline at most, mostly
  rely on background translucency + blur for separation
- Left accent bars (4px, full-height) on list rows to indicate outcome: teal (win) / coral
  (loss) / gold (pending) — already consistent across History, Dashboard recent activity, and
  the outcome bottom sheet. Keep as-is.

---

## 8. Icons

Stitch outputs use **Material Symbols Outlined** (web default). The existing React Native app
uses **`@expo/vector-icons` Ionicons**. When implementing, map each Material Symbol used in the
mockups to its closest Ionicons equivalent — do not attempt to bundle Material Symbols into the
RN app. Common mappings needed: `home` → `home-outline`/`home`, `history` → `time-outline`,
`analytics`/`insert_chart` → `bar-chart-outline`, `person` → `person-outline`,
`add_circle` → `add-circle-outline`, `notifications` → `notifications-outline`,
`arrow_back` → `arrow-back`, `lock` → `lock-closed-outline`, `check_circle` → `checkmark-circle`,
`cancel` → `close-circle`, `schedule` → `time-outline`.

---

## 9. Screen-by-Screen Notes (Stitch → implementation deltas)

| Screen | Status | Notes |
|---|---|---|
| Splash | Mocked | Mode B, logo-mark only (no visible wordmark — intentional, quiet first beat). Fix: footer copy currently reads "ANALYTICAL ADVANTAGE," should be actual tagline "Stop guessing. Start knowing." Fix: hero glow is a WebGL shader in the mockup — approximate with `LinearGradient`/radial blur (or Skia) in RN, don't attempt to port the shader directly |
| Onboarding (3 slides) | **Locked as-is** | Mode A. Slides 1 & 2 mocked and finalized; Slide 3 intentionally not pursued further — implement Slides 1 & 2 as shown, extend the same pattern for Slide 3 (gold accent word, "Get Started" CTA) at implementation time if a 3rd slide is still wanted |
| Auth | **Locked as-is** | Mode A. Google Sign-In only — matches decision log. No further iteration |
| Dashboard (active) | Mocked | Fix: coral token, Barlow on P&L figure, wordmark casing |
| Dashboard (empty) | Mocked | Good as-is, uses Mode B correctly |
| AddBet | Mocked | Fix: bottom nav pill container missing |
| Success modal | Mocked | Good as-is. Note: "VERIFIED" pill is currently decorative — flag for future wiring to real verification logic (see decisions log) |
| History | Mocked | Fix: header overlap bug, standardize to Type 1 header |
| Insights (locked) | Mocked | Good as-is — ghost-blur + lock pattern is exactly right |
| Insights (unlocked/Analytics) | Mocked | Good as-is — ring chart is the reference implementation for this component |
| Outcome Update (bottom sheet) | Mocked | Good as-is |
| Settings | Mocked | Good as-is — Quit Support Mode tone is correct |
| Leaderboard | Mocked | Good as-is |
| About | Mocked | Fix: wordmark casing (`Bet Ledger` → `BET LEDGER`), Barlow import |

---

## 10. Open Items Before Full Handoff

- [ ] Splash screen not yet run through Stitch
- [ ] Verify Barlow font actually renders correctly once ported to RN (`@expo-google-fonts/barlow`, already installed per Session 7 notes)
- [ ] Coral token reconciliation across all screen exports
- [ ] Bottom nav component build-once, reuse-everywhere (do this first — it touches 5+ screens)
- [ ] Header component: build the two types once as shared components before wiring individual screens
