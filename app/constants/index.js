// app/constants/index.js
export { COLORS } from './colors';
export { FONTS, TYPE } from './typography';
export { SPORTS, PLATFORMS, SPORT_MARKETS, DEFAULT_MARKETS, EVENT_PLACEHOLDERS, DEFAULT_EVENT_PLACEHOLDER } from './options';

// Shared spacing scale
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// Border radius — sharp & grounded, not pill-shaped
export const RADIUS = {
  sm:  4,
  md:  8,
  lg:  12,
  xl:  16,
};

// Floating tab bar clearance — bottom offset (24) + pill height (~76) + raised
// center-button protrusion (~20) + breathing room, so scroll content never sits
// under CustomTabBar (AppNavigator.js). Apply to every MainTabs screen's
// scrollable contentContainerStyle paddingBottom.
export const TAB_BAR_CLEARANCE = 160;

// Ambient shadow (used on floating cards & modals)
export const SHADOW = {
  ambient: {
    shadowColor: '#020F1E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#020F1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
};