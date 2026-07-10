// app/constants/typography.js
import { StyleSheet } from 'react-native';

// Manrope = headlines, numbers, brand
// Inter = body, labels, descriptions
// Install: npx expo install @expo-google-fonts/manrope @expo-google-fonts/inter

export const FONTS = {
  headline: 'Manrope_800ExtraBold',
  headlineBold: 'Manrope_700Bold',
  headlineMedium: 'Manrope_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  // All financial/numeric figures (P&L, win rate, budget amounts, streaks) — style guide "data-display" role
  display: 'Barlow_800ExtraBold',
};

export const TYPE = StyleSheet.create({
  // Hero P&L numbers — the biggest, most unmissable element
  displayLg: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1,
  },
  // Section headers
  headlineSm: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  // Card titles, bet names
  titleMd: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  // Body text
  bodyMd: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  // Uppercase metadata labels
  labelSm: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});