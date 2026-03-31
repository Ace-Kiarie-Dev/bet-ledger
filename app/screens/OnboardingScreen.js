// app/screens/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, StatusBar,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    tag: 'SPORTS BETTING TRACKER',
    appName: 'Bet Ledger',
    headline: 'Stop guessing.\nStart knowing.',
    highlightWord: 'knowing.',
    body: 'The honest companion for Kenyan sports bettors. No tips, no predictions — just your real numbers.',
    stat: 'KES 0',
    statLabel: 'YOUR STARTING TRUTH',
    accentColor: COLORS.primary,
  },
  {
    id: 2,
    tag: 'YOUR BETTING HISTORY',
    appName: 'Bet Ledger',
    headline: 'Every bet.\nEvery shilling.\nAccountable.',
    highlightWord: 'Accountable.',
    body: 'Log your bets on Betika, SportPesa, Odibets and more. See your real win rate — not the one you imagine.',
    stat: '64%',
    statLabel: 'AVERAGE WIN RATE REVEALED',
    accentColor: COLORS.secondary,
  },
  {
    id: 3,
    tag: 'RESPONSIBLE BETTING',
    appName: 'Bet Ledger',
    headline: 'No tips.\nNo manipulation.\nJust truth.',
    highlightWord: 'truth.',
    body: 'Set a weekly budget. Track your streaks. Take back control of your betting habits.',
    stat: '100%',
    statLabel: 'YOUR DATA. YOUR CONTROL.',
    accentColor: COLORS.primary,
  },
];

export default function OnboardingScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: width * nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      navigation.replace('Auth');
    }
  }

  function skip() {
    navigation.replace('Auth');
  }

  const isLast = activeIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[activeIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Ambient glow */}
      <View style={[styles.glowTop, { backgroundColor: `${currentSlide.accentColor}10` }]} />
      <View style={styles.glowBottom} />

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide) => (
          <View key={slide.id} style={styles.slide}>

            {/* App identity — top of every slide */}
            <View style={styles.identity}>
              <View style={styles.logoMark}>
                <Text style={styles.logoIcon}>₿</Text>
              </View>
              <View>
                <Text style={styles.appName}>{slide.appName}</Text>
                <Text style={styles.appTag}>{slide.tag}</Text>
              </View>
            </View>

            {/* Data visual card */}
            <View style={[styles.dataCard, { borderLeftColor: slide.accentColor }]}>
              <Text style={[styles.dataLabel, { color: slide.accentColor }]}>
                {slide.statLabel}
              </Text>
              <Text style={[styles.dataStat, { color: slide.accentColor }]}>
                {slide.stat}
              </Text>
              <View style={styles.dataBarBg}>
                <View style={[
                  styles.dataBarFill,
                  {
                    width: slide.id === 3 ? '100%' : slide.id === 2 ? '64%' : '0%',
                    backgroundColor: slide.accentColor,
                  }
                ]} />
              </View>
            </View>

            {/* Headline with highlighted last word */}
            <HeadlineWithHighlight
              headline={slide.headline}
              highlightWord={slide.highlightWord}
              accentColor={slide.accentColor}
            />

            {/* Body */}
            <Text style={styles.body}>{slide.body}</Text>

            {/* Betting platforms badge on slide 2 */}
            {slide.id === 2 && (
              <View style={styles.platformsRow}>
                {['Betika', 'SportPesa', 'Odibets', 'M-Cheza'].map((p) => (
                  <View key={p} style={styles.platformChip}>
                    <Text style={styles.platformText}>{p}</Text>
                  </View>
                ))}
              </View>
            )}

          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
                i === activeIndex && { backgroundColor: currentSlide.accentColor },
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: currentSlide.accentColor }]}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Text style={styles.nextArrow}> →</Text>
          </TouchableOpacity>

          {!isLast && (
            <TouchableOpacity onPress={skip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Already have account — only on last slide */}
        {isLast && (
          <TouchableOpacity onPress={() => navigation.replace('Auth')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={{ color: COLORS.primary }}>Log in</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Headline renderer with teal/gold last word highlight ──────────────────
function HeadlineWithHighlight({ headline, highlightWord, accentColor }) {
  const lines = headline.split('\n');
  return (
    <View style={styles.headlineWrap}>
      {lines.map((line, i) => {
        const isHighlightLine = line.trim() === highlightWord.trim();
        return (
          <Text key={i} style={[styles.headline, isHighlightLine && { color: accentColor }]}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  glowTop: {
    position: 'absolute', top: -100, right: -100,
    width: 350, height: 350, borderRadius: 175,
  },
  glowBottom: {
    position: 'absolute', bottom: -80, left: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: `${COLORS.secondary}08`,
  },
  slide: {
    width,
    paddingHorizontal: SPACING.xl,
    paddingTop: 64,
    paddingBottom: SPACING.lg,
    justifyContent: 'center',
  },

  // ─── App identity ───────────────────────────────────────────────────────
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  logoMark: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  logoIcon: {
    fontSize: 22,
    color: COLORS.primary,
    fontFamily: FONTS.headline,
  },
  appName: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: COLORS.primary,
    letterSpacing: -0.5,
    fontWeight: '800',
  },
  appTag: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLORS.outline,
    marginTop: 1,
  },

  // ─── Data card ──────────────────────────────────────────────────────────
  dataCard: {
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 3,
  },
  dataLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  dataStat: {
    fontFamily: FONTS.headline,
    fontSize: 44,
    letterSpacing: -1,
    marginBottom: SPACING.md,
  },
  dataBarBg: {
    height: 4,
    backgroundColor: COLORS.surfaceHighest,
    borderRadius: 2,
    overflow: 'hidden',
  },
  dataBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ─── Headline ───────────────────────────────────────────────────────────
  headlineWrap: { marginBottom: SPACING.md },
  headline: {
    fontFamily: FONTS.headline,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
    color: COLORS.onSurface,
    fontWeight: '800',
  },

  // ─── Body ───────────────────────────────────────────────────────────────
  body: {
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },

  // ─── Platform chips (slide 2) ───────────────────────────────────────────
  platformsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  platformChip: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: `${COLORS.secondary}40`,
  },
  platformText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },

  // ─── Footer ─────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 40,
    gap: SPACING.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surfaceHighest,
  },
  dotActive: {
    width: 28,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: RADIUS.lg,
  },
  nextText: {
    fontFamily: FONTS.headlineBold,
    fontSize: 16,
    color: COLORS.onPrimary,
    fontWeight: '700',
  },
  nextArrow: {
    fontSize: 16,
    color: COLORS.onPrimary,
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 18,
  },
  skipText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: `${COLORS.primary}80`,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loginLinkText: {
    fontFamily: FONTS.body,
    fontSize: 14,
    color: COLORS.onSurfaceVariant,
  },
});