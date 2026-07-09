// app/screens/OnboardingScreen.js
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW } from '../constants';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.55;

// ─── Topographic contour overlay (repeating wavy lines, ~15% opacity) ───────
function ContourOverlay() {
  const lines = [0.15, 0.32, 0.5, 0.68, 0.85];
  return (
    <Svg
      width={width}
      height={HERO_HEIGHT}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {lines.map((t, i) => {
        const y = HERO_HEIGHT * t;
        const amp = 14 + (i % 3) * 6;
        const d = `M0,${y} C${width * 0.25},${y - amp} ${width * 0.4},${y + amp} ${width * 0.6},${y} C${width * 0.8},${y - amp} ${width * 0.9},${y + amp} ${width},${y}`;
        return (
          <Path
            key={i}
            d={d}
            stroke="#FFFFFF"
            strokeWidth={1}
            fill="none"
            opacity={0.15}
          />
        );
      })}
    </Svg>
  );
}

// ─── Asymmetric organic wave cut between hero and content zones ────────────
function HeroWave() {
  const waveHeight = 56;
  const d = `M0,${waveHeight * 0.4}
    C${width * 0.22},${waveHeight * 1.3} ${width * 0.38},0 ${width * 0.62},${waveHeight * 0.5}
    C${width * 0.82},${waveHeight * 1.1} ${width * 0.92},${waveHeight * 0.2} ${width},${waveHeight * 0.65}
    L${width},${waveHeight} L0,${waveHeight} Z`;

  return (
    <Svg
      width={width}
      height={waveHeight}
      style={styles.wave}
      pointerEvents="none"
    >
      <Path d={d} fill={COLORS.background} />
    </Svg>
  );
}

// ─── Floating wrapper: gentle up/down drift + fade-in when active ─────────
function FloatingCard({ children, style, active }) {
  const floatY = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: active ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [active, fade]);

  const flatStyle = StyleSheet.flatten(style) || {};
  const baseTransform = flatStyle.transform || [];

  return (
    <Animated.View
      style={[flatStyle, { opacity: fade, transform: [...baseTransform, { translateY: floatY }] }]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Pill chip used inside the bet-slip card ────────────────────────────────
function Chip({ label }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

// ─── Slide 1 hero: glassmorphism bet-slip card ──────────────────────────────
function BetSlipCard({ active }) {
  return (
    <FloatingCard style={[styles.glassCard, { transform: [{ rotate: '-3deg' }] }]} active={active}>
      <View style={styles.row}>
        <View style={styles.goldDot} />
        <Text style={[TYPE.labelSm, { color: COLORS.secondary }]}>LOGGED · TODAY</Text>
      </View>

      <Text style={styles.betSlipTitle}>ARSENAL vs CHELSEA</Text>

      <View style={[styles.row, { gap: SPACING.sm, marginTop: SPACING.md }]}>
        <Chip label="STAKE: KES 500" />
        <Chip label="ODDS: 2.40" />
      </View>

      <View style={[styles.rowBetween, { marginTop: SPACING.lg }]}>
        <Text style={styles.betSlipAmount}>+KES 700</Text>
        <View style={styles.winBadge}>
          <Text style={styles.winBadgeText}>WIN</Text>
        </View>
      </View>
    </FloatingCard>
  );
}

// ─── Slide 2 hero: glassmorphism analytics card ─────────────────────────────
function AnalyticsCard({ active }) {
  const bars = [
    { h: 0.4, color: 'rgba(66, 222, 195, 0.4)' },
    { h: 0.6, color: 'rgba(66, 222, 195, 0.55)' },
    { h: 1.0, color: COLORS.primary },
    { h: 0.5, color: 'rgba(66, 222, 195, 0.5)' },
    { h: 0.8, color: 'rgba(66, 222, 195, 0.7)' },
  ];
  const chartHeight = 120;

  return (
    <FloatingCard style={[styles.glassCard, { transform: [{ rotate: '3deg' }] }]} active={active}>
      <View style={styles.rowBetween}>
        <View style={styles.placeholderBarThin} />
        <View style={styles.goldCircle} />
      </View>

      <View style={styles.barChartRow}>
        {bars.map((bar, i) => (
          <View
            key={i}
            style={[
              styles.barChartBar,
              { height: chartHeight * bar.h, backgroundColor: bar.color },
            ]}
          />
        ))}
      </View>

      <View style={{ marginTop: SPACING.md, gap: SPACING.sm }}>
        <View style={styles.placeholderLineFull} />
        <View style={styles.placeholderLinePartial} />
      </View>

      <View style={styles.statPill}>
        <Ionicons name="trending-up" size={12} color={COLORS.primary} />
        <Text style={[TYPE.labelSm, { color: COLORS.onSurface, marginLeft: 4 }]}>
          GROWTH +24%
        </Text>
      </View>
    </FloatingCard>
  );
}

// ─── Slide 3 hero: glassmorphism budget card ────────────────────────────────
function BudgetCard({ active }) {
  const streakInitials = ['MT', 'WT', 'FS'];

  return (
    <FloatingCard style={[styles.glassCard, styles.budgetCard, { transform: [] }]} active={active}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.budgetLabel}>WEEKLY BUDGET</Text>
          <Text style={styles.budgetAmount}>KES 25,000</Text>
        </View>
        <Ionicons name="shield-checkmark" size={28} color={COLORS.secondary} />
      </View>

      <View style={[styles.rowBetween, { marginTop: SPACING.md }]}>
        <Text style={styles.budgetSubLabel}>USED: KES 14,250</Text>
        <Text style={styles.budgetSubLabel}>REMAINING: KES 10,750</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        {streakInitials.map((initials, i) => {
          const isFilled = i === streakInitials.length - 1;
          return (
            <View
              key={initials}
              style={[
                styles.streakCircle,
                isFilled ? styles.streakCircleFilled : styles.streakCircleOutline,
                i > 0 && { marginLeft: -10 },
              ]}
            >
              <Text
                style={[
                  styles.streakCircleText,
                  { color: isFilled ? COLORS.onPrimary : COLORS.primary },
                ]}
              >
                {initials}
              </Text>
            </View>
          );
        })}
        <Text style={styles.streakLabel}>4-Week Clean Streak</Text>
      </View>
    </FloatingCard>
  );
}

// ─── Animated pagination dots ───────────────────────────────────────────────
function PaginationDots({ count, activeIndex }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} active={i === activeIndex} />
      ))}
    </View>
  );
}

function Dot({ active }) {
  const widthAnim = useRef(new Animated.Value(active ? 32 : 8)).current;
  const colorAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: active ? 32 : 8,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(colorAnim, {
        toValue: active ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active]);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.outlineVariant, COLORS.primary],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { width: widthAnim, backgroundColor },
      ]}
    />
  );
}

// ─── Animated CTA button (press scale) ──────────────────────────────────────
function CTAButton({ label, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }).start();
  }
  function onPressOut() {
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaText}>{label}</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.onPrimary} style={{ marginLeft: SPACING.sm }} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Slide definitions ───────────────────────────────────────────────────────
const SLIDES = [
  {
    key: 'track',
    hero: (active) => <BetSlipCard active={active} />,
    headlineLines: [
      { text: 'Track every bet.', color: COLORS.onSurface },
      { text: 'Honestly.', color: COLORS.secondary },
    ],
    subtext: 'Log your wins and losses without the spin.',
    cta: 'NEXT',
  },
  {
    key: 'patterns',
    hero: (active) => <AnalyticsCard active={active} />,
    headlineLines: [
      { text: 'See your ', color: COLORS.onSurface, inline: [{ text: 'real', color: COLORS.secondary }, { text: ' patterns', color: COLORS.onSurface }] },
    ],
    subtext: 'Focus on your stats and streaks, not tips or predictions.',
    cta: 'NEXT',
  },
  {
    key: 'budget',
    hero: (active) => <BudgetCard active={active} />,
    headlineLines: [
      { text: 'Stay inside your ', color: COLORS.onSurface, inline: [{ text: 'budget', color: COLORS.secondary }] },
    ],
    subtext: 'Track weekly limits and maintain your clean streaks.',
    cta: 'GET STARTED',
  },
];

function Headline({ lines }) {
  return (
    <Text style={styles.headline}>
      {lines.map((line, i) => {
        if (line.inline) {
          return (
            <Text key={i}>
              <Text style={{ color: line.color }}>{line.text}</Text>
              {line.inline.map((seg, j) => (
                <Text key={j} style={{ color: seg.color }}>{seg.text}</Text>
              ))}
            </Text>
          );
        }
        return (
          <Text key={i} style={{ color: line.color }}>
            {line.text}
            {i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      })}
    </Text>
  );
}

export default function OnboardingScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  function goToAuth() {
    navigation.replace('Auth');
  }

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      scrollRef.current?.scrollTo({ x: width * nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      goToAuth();
    }
  }

  function onMomentumScrollEnd(e) {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.key} style={styles.slide}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroZone}
            >
              <ContourOverlay />

              {index < SLIDES.length - 1 && (
                <TouchableOpacity style={styles.skipButton} onPress={goToAuth} hitSlop={8}>
                  <Text style={styles.skipText}>SKIP</Text>
                </TouchableOpacity>
              )}

              <View style={styles.heroCardWrap}>
                {slide.hero(index === activeIndex)}
              </View>

              <HeroWave />
            </LinearGradient>

            <View style={styles.contentZone}>
              <View>
                <Headline lines={slide.headlineLines} />
                <Text style={styles.subtext}>{slide.subtext}</Text>
              </View>

              <View style={styles.bottomControls}>
                <PaginationDots count={SLIDES.length} activeIndex={activeIndex} />
                <CTAButton label={slide.cta} onPress={goNext} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  slide: {
    width,
    height,
  },

  // ─── Hero zone ──────────────────────────────────────────────────────────
  heroZone: {
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  skipButton: {
    position: 'absolute',
    top: SPACING.xl,
    right: SPACING.lg,
    zIndex: 2,
  },
  skipText: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  heroCardWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  wave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
  },

  // ─── Glass card (shared) ────────────────────────────────────────────────
  glassCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(15, 28, 44, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  budgetCard: {
    maxWidth: 340,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ─── Bet slip card (slide 1) ────────────────────────────────────────────
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginRight: SPACING.xs,
  },
  betSlipTitle: {
    fontFamily: FONTS.headlineBold,
    fontSize: 22,
    color: COLORS.onSurface,
    marginTop: SPACING.sm,
  },
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: {
    ...TYPE.labelSm,
    color: COLORS.onSurface,
  },
  betSlipAmount: {
    fontFamily: FONTS.headline,
    fontSize: 24,
    color: COLORS.primary,
  },
  winBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  winBadgeText: {
    ...TYPE.labelSm,
    fontWeight: 'bold',
    color: COLORS.onPrimary,
  },

  // ─── Analytics card (slide 2) ───────────────────────────────────────────
  placeholderBarThin: {
    width: 80,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  goldCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    height: 120,
    marginTop: SPACING.lg,
  },
  barChartBar: {
    flex: 1,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
  },
  placeholderLineFull: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeholderLinePartial: {
    width: '60%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statPill: {
    position: 'absolute',
    bottom: -14,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 28, 44, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    ...SHADOW.subtle,
  },

  // ─── Budget card (slide 3) ──────────────────────────────────────────────
  budgetLabel: {
    ...TYPE.labelSm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  budgetAmount: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    color: '#FFFFFF',
    marginTop: SPACING.xs,
  },
  budgetSubLabel: {
    ...TYPE.labelSm,
    textTransform: 'none',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  progressFill: {
    width: '57%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: SPACING.lg,
  },
  streakCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCircleOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  streakCircleFilled: {
    backgroundColor: COLORS.primary,
  },
  streakCircleText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
  },
  streakLabel: {
    ...TYPE.titleMd,
    color: '#FFFFFF',
    marginLeft: SPACING.md,
  },

  // ─── Content zone ───────────────────────────────────────────────────────
  contentZone: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    justifyContent: 'space-between',
  },
  headline: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -1.2,
  },
  subtext: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.md,
  },
  bottomControls: {
    gap: SPACING.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 999,
  },
  ctaText: {
    fontFamily: FONTS.headlineBold,
    fontSize: 16,
    color: COLORS.onPrimary,
    fontWeight: 'bold',
  },
});
