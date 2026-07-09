// app/screens/DashboardScreen.js
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, createUserProfile, getBets } from '../utils/storage';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW } from '../constants';

const LOSS_STREAK_DANGER = 3;
const BUDGET_DANGER_PCT = 80;

function formatNumber(value) {
  const num = Math.round(Number(value) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function outcomeColor(outcome) {
  if (outcome === 'win') return COLORS.win;
  if (outcome === 'loss') return COLORS.loss;
  return COLORS.pending;
}

function calculateStats(bets, profile) {
  const settled = bets.filter((b) => b.outcome === 'win' || b.outcome === 'loss');
  const wins = settled.filter((b) => b.outcome === 'win');

  const totalStaked = settled.reduce((sum, b) => sum + Number(b.stake || 0), 0);
  const totalReturns = settled.reduce((sum, b) => {
    if (b.outcome === 'win') return sum + Number(b.stake || 0) * Number(b.odds || 0);
    return sum;
  }, 0);

  const netPL = totalReturns - totalStaked;
  const winRate = settled.length ? (wins.length / settled.length) * 100 : 0;
  const roi = totalStaked ? (netPL / totalStaked) * 100 : 0;

  // bets arrive newest-first; count consecutive losses from the top
  let lossStreak = 0;
  for (const bet of bets) {
    if (bet.outcome === 'loss') lossStreak += 1;
    else if (bet.outcome === 'win') break;
  }

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklySpend = bets
    .filter((b) => new Date(b.date || b.createdAt) >= weekAgo)
    .reduce((sum, b) => sum + Number(b.stake || 0), 0);

  const weeklyBudget = Number(profile?.weeklyBudget || 0);
  const budgetPct = weeklyBudget ? Math.min((weeklySpend / weeklyBudget) * 100, 100) : 0;

  return { netPL, winRate, roi, lossStreak, weeklySpend, weeklyBudget, budgetPct };
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [bets, setBets] = useState([]);

  const loadData = useCallback(async (isRefresh) => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);

    try {
      let userProfile = await getUserProfile(user.uid);
      if (!userProfile) {
        await createUserProfile(user);
        userProfile = await getUserProfile(user.uid);
      }
      const userBets = await getBets(user.uid);
      setProfile(userProfile);
      setBets(userBets);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
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

  async function handleDebugSignOut() {
    await signOut(auth);
    // onAuthStateChanged in AppNavigator routes back to Onboarding automatically.
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (bets.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyHeaderRow}>
          <Text style={styles.emptyGreeting}>Hey, {profile?.username || 'Player'}</Text>
          {/* TODO: Remove once SettingsScreen has a real sign-out — Session 8 */}
          <TouchableOpacity onPress={handleDebugSignOut} hitSlop={8}>
            <Text style={styles.debugSignOutText}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          <Text style={styles.emptyGhost}>KES 0</Text>
          <Text style={styles.emptyTitle}>Your story starts with your first bet</Text>
          <TouchableOpacity
            style={[styles.emptyCta, SHADOW.subtle]}
            onPress={() => navigation.navigate('AddBet')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyCtaText}>Log a Bet</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.onPrimary} style={{ marginLeft: SPACING.sm }} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const stats = calculateStats(bets, profile);
  const isPositive = stats.netPL >= 0;
  const heroColor = isPositive ? COLORS.primary : COLORS.tertiary;
  const lossStreakDanger = stats.lossStreak >= LOSS_STREAK_DANGER;
  const budgetDanger = stats.budgetPct >= BUDGET_DANGER_PCT;
  const recentBets = bets.slice(0, 3);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={[styles.header, styles.headerRow]}>
          <View>
            <Text style={styles.headerLabel}>Dashboard</Text>
            <Text style={styles.headerGreeting}>Hey, {profile?.username || 'Bettor'}</Text>
          </View>
          {/* TODO: Remove once SettingsScreen has a real sign-out — Session 8 */}
          <TouchableOpacity onPress={handleDebugSignOut} hitSlop={8}>
            <Text style={styles.debugSignOutText}>SIGN OUT</Text>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={[COLORS.surfaceHigh, COLORS.surfaceLow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, SHADOW.ambient]}
        >
          <Text style={styles.heroLabel}>Net P&L</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.heroCurrency, { color: heroColor }]}>KES</Text>
            <Text style={[styles.heroAmount, { color: heroColor }]}>
              {isPositive ? '+' : '−'}{formatNumber(Math.abs(stats.netPL))}
            </Text>
          </View>
          <View style={[styles.roiBadge, { backgroundColor: `${heroColor}26` }]}>
            <Text style={[styles.roiBadgeText, { color: heroColor }]}>
              {isPositive ? '+' : '−'}{Math.abs(stats.roi).toFixed(1)}% ROI
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statRow}>
          <View style={[styles.statCard, SHADOW.subtle]}>
            <Text style={styles.statLabel}>Win Rate</Text>
            <Text style={styles.statValue}>{stats.winRate.toFixed(0)}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${stats.winRate}%`, backgroundColor: COLORS.primary }]} />
            </View>
          </View>

          <View style={[styles.statCard, SHADOW.subtle]}>
            <Text style={[styles.statLabel, lossStreakDanger && styles.dangerText]}>Loss Streak</Text>
            <Text style={[styles.statValue, lossStreakDanger && styles.dangerText]}>{stats.lossStreak}</Text>
            <Text style={styles.statHint}>
              {lossStreakDanger ? 'Consider a break' : 'Steady so far'}
            </Text>
          </View>
        </View>

        <View style={[styles.card, SHADOW.subtle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.statLabel}>Weekly Budget</Text>
            <Text style={[styles.budgetAmount, budgetDanger && styles.dangerText]}>
              KES {formatNumber(stats.weeklySpend)} / {formatNumber(stats.weeklyBudget)}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${stats.budgetPct}%`, backgroundColor: budgetDanger ? COLORS.tertiary : COLORS.primary },
              ]}
            />
          </View>
          {stats.weeklyBudget === 0 && (
            <Text style={styles.statHint}>Set a weekly budget in Settings</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Recent Bets</Text>
        <View style={[styles.card, styles.betsCard, SHADOW.subtle]}>
          {recentBets.map((bet, index) => (
            <View
              key={bet.id}
              style={[styles.betRow, index % 2 === 1 && styles.betRowAlt]}
            >
              <View style={[styles.accentBar, { backgroundColor: outcomeColor(bet.outcome) }]} />
              <View style={styles.betInfo}>
                <Text style={styles.betTeams} numberOfLines={1}>{bet.teams}</Text>
                <Text style={styles.betMeta}>{bet.sport} · KES {formatNumber(bet.stake)}</Text>
              </View>
              <View style={[styles.outcomeBadge, { backgroundColor: `${outcomeColor(bet.outcome)}26` }]}>
                <Text style={[styles.outcomeBadgeText, { color: outcomeColor(bet.outcome) }]}>
                  {(bet.outcome || 'pending').toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('AddBet')} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Log a Bet</Text>
        </TouchableOpacity>
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
    paddingBottom: SPACING.xxl,
  },

  // ─── Header ───
  header: {
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.xs,
  },
  headerGreeting: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
  },
  debugSignOutText: {
    ...TYPE.labelSm,
    color: COLORS.tertiary,
  },

  // ─── Empty state ───
  emptyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  emptyGreeting: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyGhost: {
    ...TYPE.displayLg,
    fontSize: 46,
    lineHeight: 50,
    color: COLORS.surfaceHigh,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPE.titleMd,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  emptyCta: {
    alignSelf: 'center',
    width: '70%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
  emptyCtaText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onPrimary,
  },

  // ─── Hero card ───
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  heroLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  heroCurrency: {
    ...TYPE.bodyMd,
    fontFamily: FONTS.bodySemiBold,
    marginRight: SPACING.xs,
    marginBottom: 8,
  },
  heroAmount: {
    ...TYPE.displayLg,
  },
  roiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  roiBadgeText: {
    ...TYPE.labelSm,
  },

  // ─── Stat cards ───
  statRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surfaceLow,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.xs,
  },
  statValue: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    marginBottom: SPACING.sm,
  },
  statHint: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  budgetAmount: {
    ...TYPE.bodyMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onSurface,
  },
  dangerText: {
    color: COLORS.tertiary,
  },

  // ─── Progress bars ───
  progressTrack: {
    height: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceHighest,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },

  // ─── Recent bets ───
  sectionTitle: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
  },
  betsCard: {
    padding: 0,
    overflow: 'hidden',
  },
  betRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  betRowAlt: {
    backgroundColor: COLORS.surface,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: RADIUS.sm,
    marginRight: SPACING.md,
  },
  betInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  betTeams: {
    ...TYPE.titleMd,
    color: COLORS.onSurface,
  },
  betMeta: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  outcomeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  outcomeBadgeText: {
    ...TYPE.labelSm,
    fontSize: 10,
  },

  // ─── CTA ───
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ctaText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onPrimary,
  },
});
