// app/screens/InsightsScreen.js
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Polyline } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase';
import { getBets } from '../utils/storage';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW, TAB_BAR_CLEARANCE } from '../constants';

const UNLOCK_THRESHOLD = 5;

const LOCKED_TABS = ['Overview', 'Deep Dive', 'Benchmarks'];
const RANGE_OPTIONS = ['Day', 'Week', 'Month', 'Year'];
const RANGE_DAYS = { Day: 1, Week: 7, Month: 30, Year: 365 };

// Ring segments are colored by SPORT IDENTITY, not outcome — this deliberately reuses
// the teal/gold/coral palette with a different meaning (approved mockup call).
// Football=teal, Basketball=gold, Tennis=coral-as-identity (NOT a loss signal here).
const SPORT_COLORS = {
  Football: COLORS.primary,
  Basketball: COLORS.secondary,
  Tennis: COLORS.loss,
};
const SPORT_ICONS = {
  Football: 'football-outline',
  Basketball: 'basketball-outline',
  Tennis: 'tennisball-outline',
};

function getSportColor(sport) {
  return SPORT_COLORS[sport] || COLORS.onSurfaceVariant;
}
function getSportIcon(sport) {
  return SPORT_ICONS[sport] || 'ellipse-outline';
}

function formatNumber(value) {
  const num = Math.round(Number(value) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getBetTime(bet) {
  return new Date(bet.date || bet.matchTime || bet.createdAt || 0).getTime();
}

function filterByRange(bets, range, now) {
  const cutoff = now - RANGE_DAYS[range] * 24 * 60 * 60 * 1000;
  return bets.filter((b) => getBetTime(b) >= cutoff);
}

function filterPreviousRange(bets, range, now) {
  const days = RANGE_DAYS[range];
  const currentStart = now - days * 24 * 60 * 60 * 1000;
  const previousStart = now - 2 * days * 24 * 60 * 60 * 1000;
  return bets.filter((b) => {
    const t = getBetTime(b);
    return t >= previousStart && t < currentStart;
  });
}

// Net effect of a single settled bet on P&L — a win returns profit, a loss costs the
// stake, a pending bet hasn't resolved yet so it never moves the total.
function getBetDelta(bet) {
  if (bet.outcome === 'win') return Number(bet.stake || 0) * Number(bet.odds || 0) - Number(bet.stake || 0);
  if (bet.outcome === 'loss') return -Number(bet.stake || 0);
  return 0;
}

function computeNetPL(bets) {
  return bets.reduce((sum, b) => sum + getBetDelta(b), 0);
}

// Cumulative P&L after each settled bet, in chronological order — the running
// series the Trend Over Time line chart plots.
function buildTrendSeries(bets) {
  const chronological = [...bets]
    .filter((b) => b.outcome === 'win' || b.outcome === 'loss')
    .sort((a, b) => getBetTime(a) - getBetTime(b));
  let cumulative = 0;
  return chronological.map((b) => (cumulative += getBetDelta(b)));
}

// Shared by Sport/Market/Platform breakdowns — win rate grouped by whichever
// bet field groupBy selects, keyed by label for display.
function computeEfficiency(bets, groupBy) {
  const groups = {};
  bets.forEach((b) => {
    const key = b[groupBy] || 'Other';
    if (!groups[key]) groups[key] = { wins: 0, settled: 0 };
    if (b.outcome === 'win' || b.outcome === 'loss') {
      groups[key].settled += 1;
      if (b.outcome === 'win') groups[key].wins += 1;
    }
  });
  return Object.entries(groups)
    .filter(([, g]) => g.settled > 0)
    .map(([label, g]) => ({ label, winRate: (g.wins / g.settled) * 100 }))
    .sort((a, b) => b.winRate - a.winRate);
}

function computeInsights(bets) {
  const totalStaked = bets.reduce((sum, b) => sum + Number(b.stake || 0), 0);
  const totalReturned = bets
    .filter((b) => b.outcome === 'win')
    .reduce((sum, b) => sum + Number(b.stake || 0) * Number(b.odds || 0), 0);
  const pendingExposure = bets
    .filter((b) => b.outcome === 'pending')
    .reduce((sum, b) => sum + Number(b.stake || 0), 0);
  const netPL = computeNetPL(bets);

  // Longest run of consecutive wins, in chronological order. Pending bets don't break
  // or extend a streak (outcome not yet known); only a loss resets it.
  const chronological = [...bets].sort((a, b) => getBetTime(a) - getBetTime(b));
  let bestStreak = 0;
  let current = 0;
  for (const b of chronological) {
    if (b.outcome === 'win') {
      current += 1;
      bestStreak = Math.max(bestStreak, current);
    } else if (b.outcome === 'loss') {
      current = 0;
    }
  }

  const stakeBySport = {};
  bets.forEach((b) => {
    const sport = b.sport || 'Other';
    stakeBySport[sport] = (stakeBySport[sport] || 0) + Number(b.stake || 0);
  });

  const sportEfficiency = computeEfficiency(bets, 'sport');
  const marketEfficiency = computeEfficiency(bets, 'market');
  const platformEfficiency = computeEfficiency(bets, 'platform');
  const trendPoints = buildTrendSeries(bets);

  return {
    totalStaked, totalReturned, pendingExposure, netPL, bestStreak, stakeBySport,
    sportEfficiency, marketEfficiency, platformEfficiency, trendPoints,
  };
}

const RING_SIZE = 180;
const RING_RADIUS = 70;
const RING_STROKE = 20;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function buildRingSegments(stakeBySport) {
  const total = Object.values(stakeBySport).reduce((sum, v) => sum + v, 0);
  if (!total) return [];

  let cumulative = 0;
  return Object.entries(stakeBySport)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([sport, value]) => {
      const fraction = value / total;
      const segment = {
        sport,
        fraction,
        color: getSportColor(sport),
        dashArray: `${fraction * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`,
        dashOffset: -cumulative * RING_CIRCUMFERENCE,
      };
      cumulative += fraction;
      return segment;
    });
}

// ─── Type 1 header (tab-root pattern): logo mark + wordmark, bell ───────────
function InsightsHeader() {
  return (
    <View style={styles.headerRow}>
      <View style={styles.brandRow}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.logoMark} resizeMode="contain" />
        <Text style={styles.wordmark}>BET LEDGER</Text>
      </View>
      <TouchableOpacity style={styles.bellButton} hitSlop={8}>
        <Ionicons name="notifications-outline" size={20} color={COLORS.onSurfaceVariant} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Ring chart: proportional-arc donut built from raw SVG (not a canned chart) ──
function SportRing({ segments, muted }) {
  return (
    <Svg width={RING_SIZE} height={RING_SIZE}>
      <G rotation="-90" origin={`${RING_CENTER}, ${RING_CENTER}`}>
        <Circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          stroke={COLORS.surfaceHigh}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {!muted &&
          segments.map((seg) => (
            <Circle
              key={seg.sport}
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              stroke={seg.color}
              strokeWidth={RING_STROKE}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="butt"
              fill="none"
            />
          ))}
      </G>
    </Svg>
  );
}

// ─── Efficiency row list: shared by Sport/Market/Platform breakdowns ─────────
function EfficiencyList({ rows, icon, color, getIcon, getColor, emptyHint }) {
  if (rows.length === 0) {
    return <Text style={styles.statHint}>{emptyHint}</Text>;
  }
  return rows.map((row, index) => {
    const rowIcon = getIcon ? getIcon(row.label) : icon;
    const rowColor = getColor ? getColor(row.label) : color;
    return (
      <View key={row.label} style={[styles.efficiencyRow, index > 0 && styles.efficiencyRowBorder]}>
        <Ionicons name={rowIcon} size={18} color={rowColor} />
        <Text style={styles.efficiencySport} numberOfLines={1}>{row.label}</Text>
        <View style={styles.efficiencyTrack}>
          <View style={[styles.efficiencyFill, { width: `${row.winRate}%`, backgroundColor: rowColor }]} />
        </View>
        <Text style={styles.efficiencyPct}>{row.winRate.toFixed(0)}%</Text>
      </View>
    );
  });
}

// ─── Trend line: cumulative net P&L across settled bets, raw SVG like the ring ──
const TREND_WIDTH = 300;
const TREND_HEIGHT = 100;
const TREND_PADDING = 12;

function buildTrendPolylinePoints(points) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (TREND_WIDTH - TREND_PADDING * 2) / (points.length - 1);
  return points
    .map((v, i) => {
      const x = TREND_PADDING + i * stepX;
      const y = TREND_PADDING + (1 - (v - min) / span) * (TREND_HEIGHT - TREND_PADDING * 2);
      return `${x},${y}`;
    })
    .join(' ');
}

function TrendLine({ points }) {
  const polylinePoints = buildTrendPolylinePoints(points);
  if (!polylinePoints) {
    return <Text style={styles.statHint}>Not enough settled bets yet to show a trend.</Text>;
  }
  return (
    <Svg width="100%" height={TREND_HEIGHT} viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`} preserveAspectRatio="none">
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke={COLORS.primary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Locked state ────────────────────────────────────────────────────────────
function LockedInsights({ betCount, activeTab, onSelectTab, navigation }) {
  const progress = Math.min(betCount / UNLOCK_THRESHOLD, 1);
  const remaining = Math.max(UNLOCK_THRESHOLD - betCount, 0);

  return (
    <>
      <View style={styles.tabRow}>
        {LOCKED_TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => onSelectTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.lockHero, SHADOW.ambient]}>
        <View style={styles.ghostPreview} pointerEvents="none">
          <SportRing segments={[]} muted />
          <View style={styles.ghostBentoRow}>
            <View style={styles.ghostBentoCard} />
            <View style={styles.ghostBentoCard} />
          </View>
        </View>

        <View style={styles.lockOverlay}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="lock-closed" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.lockTitle}>Unlock Your Insights</Text>
          <Text style={styles.lockSubtext}>
            {remaining > 0
              ? `Log ${remaining} more bet${remaining === 1 ? '' : 's'} to unlock Insights`
              : 'Unlocking…'}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressCount}>{betCount} / {UNLOCK_THRESHOLD}</Text>

          <TouchableOpacity
            style={[styles.lockCta, SHADOW.subtle]}
            onPress={() => navigation.navigate('AddBet')}
            activeOpacity={0.85}
          >
            <Text style={styles.lockCtaText}>Log New Bet</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Sport Efficiency</Text>
      <View style={[styles.card, styles.dimmedCard]} pointerEvents="none">
        <View style={styles.ghostLineFull} />
        <View style={styles.ghostLinePartial} />
      </View>

      <Text style={styles.sectionTitle}>ROI Tracker</Text>
      <View style={[styles.card, styles.dimmedCard]} pointerEvents="none">
        <View style={styles.ghostLineFull} />
        <View style={styles.ghostLinePartial} />
      </View>
    </>
  );
}

// ─── Unlocked state ──────────────────────────────────────────────────────────
function UnlockedInsights({ bets, range, onSelectRange }) {
  const now = Date.now();
  const currentBets = filterByRange(bets, range, now);
  const previousBets = filterPreviousRange(bets, range, now);

  const insights = computeInsights(currentBets);
  const segments = buildRingSegments(insights.stakeBySport);
  const isPositive = insights.netPL >= 0;
  const netColor = isPositive ? COLORS.primary : COLORS.loss;

  const previousNetPL = computeNetPL(previousBets);
  let trendLabel;
  if (previousNetPL === 0) {
    trendLabel = currentBets.length === 0 ? null : (insights.netPL === 0 ? '±0% vs last period' : 'New activity vs last period');
  } else {
    const pct = ((insights.netPL - previousNetPL) / Math.abs(previousNetPL)) * 100;
    trendLabel = `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}% vs last period`;
  }

  return (
    <>
      <Text style={styles.pageTitle}>Analytics</Text>
      <Text style={styles.pageSubtitle}>Performance overview across all markets</Text>

      <View style={styles.tabRow}>
        {RANGE_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.tab, range === r && styles.tabActive]}
            onPress={() => onSelectRange(r)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, range === r && styles.tabTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentBets.length === 0 ? (
        <View style={[styles.card, styles.emptyRangeCard]}>
          <Text style={styles.emptyRangeText}>No bets logged in this period.</Text>
        </View>
      ) : (
        <>
          <View style={[styles.ringCard, SHADOW.ambient]}>
            <View style={styles.ringWrap}>
              <SportRing segments={segments} />
              <View style={styles.ringCenter}>
                <Text style={styles.ringLabel}>Net P&L</Text>
                <Text style={[styles.ringAmount, { color: netColor }]}>
                  {isPositive ? '+' : '−'}{formatNumber(Math.abs(insights.netPL))}
                </Text>
                {trendLabel && <Text style={styles.ringTrend}>{trendLabel}</Text>}
              </View>
            </View>

            <View style={styles.legendRow}>
              {segments.map((seg) => (
                <View key={seg.sport} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                  <Text style={styles.legendText}>{seg.sport}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.sectionTitle}>Sport Efficiency</Text>
          <View style={[styles.card, SHADOW.subtle]}>
            <EfficiencyList
              rows={insights.sportEfficiency}
              getIcon={getSportIcon}
              getColor={getSportColor}
              emptyHint="No settled bets in this period yet."
            />
          </View>

          <Text style={styles.sectionTitle}>Market Breakdown</Text>
          <View style={[styles.card, SHADOW.subtle]}>
            <EfficiencyList
              rows={insights.marketEfficiency}
              icon="pricetags-outline"
              color={COLORS.primary}
              emptyHint="No settled bets by market yet."
            />
          </View>

          <Text style={styles.sectionTitle}>Platform Breakdown</Text>
          <View style={[styles.card, SHADOW.subtle]}>
            <EfficiencyList
              rows={insights.platformEfficiency}
              icon="wallet-outline"
              color={COLORS.secondary}
              emptyHint="No settled bets by platform yet."
            />
          </View>

          <Text style={styles.sectionTitle}>Trend Over Time</Text>
          <View style={[styles.card, SHADOW.subtle]}>
            <TrendLine points={insights.trendPoints} />
          </View>

          <View style={styles.bentoGrid}>
            <View style={[styles.bentoCard, SHADOW.subtle]}>
              <Text style={styles.bentoLabel}>Total Staked</Text>
              <Text style={styles.bentoValue}>KES {formatNumber(insights.totalStaked)}</Text>
            </View>
            <View style={[styles.bentoCard, SHADOW.subtle]}>
              <Text style={styles.bentoLabel}>Total Returned</Text>
              <Text style={styles.bentoValue}>KES {formatNumber(insights.totalReturned)}</Text>
            </View>
            <View style={[styles.bentoCard, SHADOW.subtle]}>
              <Text style={styles.bentoLabel}>Best Streak</Text>
              <Text style={styles.bentoValue}>{insights.bestStreak}</Text>
            </View>
            <View style={[styles.bentoCard, styles.bentoCardGold, SHADOW.subtle]}>
              <Text style={[styles.bentoLabel, styles.bentoLabelGold]}>Pending Exposure</Text>
              <Text style={[styles.bentoValue, styles.bentoValueGold]}>
                KES {formatNumber(insights.pendingExposure)}
              </Text>
            </View>
          </View>
        </>
      )}
    </>
  );
}

export default function InsightsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bets, setBets] = useState([]);
  const [lockedTab, setLockedTab] = useState('Overview');
  const [range, setRange] = useState('Week');

  const loadData = useCallback(async (isRefresh) => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    try {
      const userBets = await getBets(user.uid);
      setBets(userBets);
    } catch (err) {
      console.error('Failed to load insights data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const onRefresh = useCallback(() => loadData(true), [loadData]);

  function handleSelectLockedTab(tab) {
    if (tab !== 'Overview') {
      Alert.alert('Coming Soon', `${tab} is on the way.`);
      return;
    }
    setLockedTab(tab);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const unlocked = bets.length >= UNLOCK_THRESHOLD;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerWrap}>
        <InsightsHeader />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {unlocked ? (
          <UnlockedInsights bets={bets} range={range} onSelectRange={setRange} />
        ) : (
          <LockedInsights
            betCount={bets.length}
            activeTab={lockedTab}
            onSelectTab={handleSelectLockedTab}
            navigation={navigation}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: TAB_BAR_CLEARANCE,
  },

  // ─── Header ───
  headerWrap: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 28,
    height: 28,
    marginRight: SPACING.sm,
  },
  wordmark: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    letterSpacing: -0.5,
    color: COLORS.primary,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Page title (unlocked) ───
  pageTitle: {
    ...TYPE.headlineSm,
    fontSize: 28,
    color: COLORS.onSurface,
  },
  pageSubtitle: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },

  // ─── Tabs (locked section tabs + unlocked range tabs) ───
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tab: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  tabTextActive: {
    color: COLORS.onPrimary,
  },

  // ─── Locked hero ───
  lockHero: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    minHeight: 340,
  },
  ghostPreview: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    opacity: 0.25,
  },
  ghostBentoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    width: '100%',
  },
  ghostBentoCard: {
    flex: 1,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceHigh,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.primary}26`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  lockTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  lockSubtext: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  progressCount: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  lockCta: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  lockCtaText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onPrimary,
  },

  // ─── Dimmed bento placeholders (locked) ───
  card: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  dimmedCard: {
    opacity: 0.35,
  },
  ghostLineFull: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHigh,
  },
  ghostLinePartial: {
    width: '60%',
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceHigh,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
  },

  // ─── Progress bar (shared: locked unlock-progress + used inline elsewhere) ───
  progressTrack: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceHighest,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },

  // ─── Ring card (unlocked) ───
  ringCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: 2,
  },
  ringAmount: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 24,
  },
  ringTrend: {
    ...TYPE.bodyMd,
    fontSize: 10,
    lineHeight: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  legendText: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },

  // ─── Empty range state ───
  emptyRangeCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyRangeText: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
  },

  // ─── Sport efficiency rows ───
  efficiencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  efficiencyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  efficiencySport: {
    ...TYPE.titleMd,
    fontSize: 13,
    color: COLORS.onSurface,
    width: 100,
    marginLeft: SPACING.sm,
  },
  efficiencyTrack: {
    flex: 1,
    height: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceHighest,
    overflow: 'hidden',
    marginHorizontal: SPACING.sm,
  },
  efficiencyFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  efficiencyPct: {
    fontFamily: FONTS.display,
    fontSize: 13,
    color: COLORS.onSurface,
    width: 40,
    textAlign: 'right',
  },
  statHint: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },

  // ─── Stat bento grid ───
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  bentoCard: {
    width: '47%',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  bentoCardGold: {
    backgroundColor: `${COLORS.secondary}1A`,
    borderColor: `${COLORS.secondary}40`,
  },
  bentoLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.xs,
  },
  bentoLabelGold: {
    color: COLORS.secondary,
  },
  bentoValue: {
    fontFamily: FONTS.display,
    fontSize: 20,
    color: COLORS.onSurface,
  },
  bentoValueGold: {
    color: COLORS.secondary,
  },
});
