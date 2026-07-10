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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// ─── Type 1 header (tab-root pattern): logo mark + wordmark, bell + avatar ──
function DashboardHeader({ initial, onAvatarPress }) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Ionicons name="bar-chart" size={16} color={COLORS.onPrimary} />
        </View>
        <Text style={styles.wordmark}>BET LEDGER</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.bellButton} hitSlop={8}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onAvatarPress} hitSlop={8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Action row: Log Bet / History / Budget glass pills ────────────────────
function ActionPill({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionPill} onPress={onPress} activeOpacity={0.6}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <Text style={styles.actionPillLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionRow({ onLogBet, onHistory, onBudget }) {
  return (
    <View style={styles.actionRow}>
      <ActionPill icon="add-circle-outline" label="Log Bet" onPress={onLogBet} />
      <ActionPill icon="time-outline" label="History" onPress={onHistory} />
      <ActionPill icon="wallet-outline" label="Budget" onPress={onBudget} />
    </View>
  );
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

  // TODO: Remove once SettingsScreen has a real sign-out — Session 8
  function handleAvatarPress() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: handleDebugSignOut },
    ]);
  }

  const avatarInitial = (profile?.username || 'B').charAt(0).toUpperCase();

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
        <View style={styles.headerWrap}>
          <DashboardHeader initial={avatarInitial} onAvatarPress={handleAvatarPress} />
        </View>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          <Text style={styles.emptyGreeting}>Hey, {profile?.username || 'Player'}</Text>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bar-chart" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyGhost}>KES 0</Text>
          <Text style={styles.emptyTitle}>Your story starts with your first bet</Text>
          <TouchableOpacity
            style={[styles.emptyCta, SHADOW.subtle]}
            onPress={() => navigation.navigate('AddBet')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyCtaText}>Log a Bet</Text>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.onPrimary} style={{ marginLeft: SPACING.sm }} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const stats = calculateStats(bets, profile);
  const isPositive = stats.netPL >= 0;
  const heroColor = isPositive ? COLORS.primary : COLORS.loss;
  const lossStreakDanger = stats.lossStreak >= LOSS_STREAK_DANGER;
  const budgetDanger = stats.budgetPct >= BUDGET_DANGER_PCT;
  const recentBets = bets.slice(0, 3);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerWrap}>
        <DashboardHeader initial={avatarInitial} onAvatarPress={handleAvatarPress} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Text style={styles.greeting}>Hey, {profile?.username || 'Bettor'}</Text>

        <View style={[styles.heroCard, SHADOW.ambient]}>
          <View style={[styles.heroGlowOuter, { backgroundColor: heroColor }]} />
          <View style={[styles.heroGlowInner, { backgroundColor: heroColor }]} />

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
        </View>

        <ActionRow
          onLogBet={() => navigation.navigate('AddBet')}
          onHistory={() => navigation.navigate('History')}
          onBudget={() => navigation.navigate('Settings')}
        />

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
                { width: `${stats.budgetPct}%`, backgroundColor: budgetDanger ? COLORS.loss : COLORS.primary },
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
                <Text style={styles.betMeta}>
                  {bet.sport} · <Text style={styles.betMetaFigure}>KES {formatNumber(bet.stake)}</Text>
                </Text>
              </View>
              <View style={[styles.outcomeBadge, { backgroundColor: `${outcomeColor(bet.outcome)}26` }]}>
                <Text style={[styles.outcomeBadgeText, { color: outcomeColor(bet.outcome) }]}>
                  {(bet.outcome || 'pending').toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
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

  // ─── Header (Type 1: logo mark + wordmark, bell + avatar) ───
  headerWrap: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  wordmark: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    letterSpacing: -0.5,
    color: COLORS.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.headlineBold,
    fontSize: 14,
    color: COLORS.primary,
  },

  // ─── Greeting (moved out of header, into body) ───
  greeting: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },

  // ─── Empty state ───
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyGreeting: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 16,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${COLORS.primary}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  emptyGhost: {
    ...TYPE.displayLg,
    fontFamily: FONTS.display,
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

  // ─── Hero card (glass + radial glow) ───
  heroCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  heroGlowOuter: {
    position: 'absolute',
    top: -50,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.12,
  },
  heroGlowInner: {
    position: 'absolute',
    top: -10,
    left: 10,
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.22,
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
    fontFamily: FONTS.display,
  },
  roiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  roiBadgeText: {
    ...TYPE.labelSm,
    fontFamily: FONTS.display,
    textTransform: 'none',
    letterSpacing: 0,
  },

  // ─── Action row (glass pills) ───
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
  },
  actionPillLabel: {
    ...TYPE.labelSm,
    color: COLORS.onSurface,
    marginLeft: SPACING.xs,
  },

  // ─── Stat cards ───
  statRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
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
    fontFamily: FONTS.display,
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
    fontFamily: FONTS.display,
    color: COLORS.onSurface,
  },
  dangerText: {
    color: COLORS.loss,
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
  betMetaFigure: {
    fontFamily: FONTS.display,
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
});
