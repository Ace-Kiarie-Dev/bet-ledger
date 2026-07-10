// app/constants/colors.js
// Single source of truth for the Bet Ledger design system
// Based on Stitch "The Fiscal Truth" palette

export const COLORS = {
  // ─── Surfaces (tonal stacking — no borders, depth through bg shifts) ───
  background:       '#061423',  // base canvas
  surfaceLowest:    '#020F1E',  // modal overlays
  surfaceLow:       '#0F1C2C',  // grouped sections
  surface:          '#132030',  // mid-level containers
  surfaceHigh:      '#1E2B3B',  // elevated cards, active nav
  surfaceBright:    '#2D3A4A',  // hover states, inner glow
  surfaceHighest:   '#283646',  // input fields, chips

  // ─── Brand ───
  primary:          '#42DEC3',  // teal — wins, CTAs, active states
  primaryContainer: '#00C2A8',  // gradient end for buttons
  secondary:        '#FFB955',  // gold — pending, streaks, highlights
  tertiary:         '#FFB5B2',  // coral — losses, warnings

  // ─── Text ───
  onSurface:        '#D6E4F9',  // primary text
  onSurfaceVariant: '#BBCAC4',  // secondary/muted text
  outline:          '#85948F',  // labels, placeholders
  outlineVariant:   '#3C4A46',  // subtle separators

  // ─── Semantic aliases ───
  win:              '#42DEC3',
  loss:             '#FFB5B2',
  pending:          '#FFB955',
  onPrimary:        '#00382F',  // text on teal buttons
  error:            '#FFB5B2',  // same as tertiary

  // ─── Glass surfaces (Mode B — Command Center) ───
  glass:            'rgba(15, 28, 44, 0.6)',   // glass card background
  glassBorder:      'rgba(255, 255, 255, 0.08)', // hairline edge, no heavy border
};