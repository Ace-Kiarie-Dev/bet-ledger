// app/screens/HistoryScreen.js
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
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, getBets } from '../utils/storage';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW, SPORTS } from '../constants';
import OutcomeUpdateSheet from '../components/OutcomeUpdateSheet';

const TIME_FILTERS = ['Today', 'Week', 'Month', 'All'];
const OUTCOME_FILTERS = ['All', 'Won', 'Lost', 'Pending'];
const OUTCOME_FILTER_TO_VALUE = { Won: 'win', Lost: 'loss', Pending: 'pending' };
const SPORT_FILTERS = ['All', ...SPORTS];

function formatNumber(value) {
  const num = Math.round(Number(value) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function outcomeColor(outcome) {
  if (outcome === 'win') return COLORS.win;
  if (outcome === 'loss') return COLORS.loss;
  return COLORS.pending;
}

function getBetTime(bet) {
  return new Date(bet.date || bet.matchTime || bet.createdAt || 0).getTime();
}

function formatDate(bet) {
  const t = getBetTime(bet);
  if (!t) return '';
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getSubtitle(bet) {
  if (bet.market && bet.selection) return `${bet.market}: ${bet.selection}`;
  return bet.sport || null;
}

function matchesTimeFilter(bet, filter, now) {
  if (filter === 'All') return true;
  const t = getBetTime(bet);
  if (filter === 'Today') {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    return t >= startOfToday.getTime();
  }
  if (filter === 'Week') return t >= now - 7 * 24 * 60 * 60 * 1000;
  if (filter === 'Month') return t >= now - 30 * 24 * 60 * 60 * 1000;
  return true;
}

function computeSummary(bets) {
  const settled = bets.filter((b) => b.outcome === 'win' || b.outcome === 'loss');
  const wins = settled.filter((b) => b.outcome === 'win');
  const totalStaked = settled.reduce((sum, b) => sum + Number(b.stake || 0), 0);
  const totalReturns = settled.reduce((sum, b) => {
    if (b.outcome === 'win') return sum + Number(b.stake || 0) * Number(b.odds || 0);
    return sum;
  }, 0);
  const netProfit = totalReturns - totalStaked;
  const winRate = settled.length ? (wins.length / settled.length) * 100 : 0;
  return { count: bets.length, netProfit, winRate };
}

// ─── Type 1 header (tab-root pattern): logo mark + wordmark, bell + avatar ──
function HistoryHeader({ initial, onAvatarPress }) {
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

function FilterRow({ options, value, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      {options.map((option) => {
        const active = value === option;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onSelect(option)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{option}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function BetCard({ bet, onPress }) {
  const subtitle = getSubtitle(bet);
  const isPending = bet.outcome === 'pending';
  const isWin = bet.outcome === 'win';
  const resultColor = outcomeColor(bet.outcome);
  const profit = Number(bet.stake || 0) * Number(bet.odds || 0) - Number(bet.stake || 0);

  return (
    <TouchableOpacity style={[styles.betCard, SHADOW.subtle]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.accentBar, { backgroundColor: resultColor }]} />
      <View style={styles.betCardBody}>
        <View style={styles.betCardTopRow}>
          {bet.backdated && (
            <View style={styles.tagPillGold}>
              <Text style={styles.tagPillTextGold}>LOGGED LATE</Text>
            </View>
          )}
          {bet.platform && (
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{bet.platform.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={styles.betCardMatch} numberOfLines={1}>{bet.teams}</Text>
        {subtitle && <Text style={styles.betCardSubtitle} numberOfLines={1}>{subtitle}</Text>}

        <View style={styles.betCardBottomRow}>
          <View>
            <Text style={styles.betCardStake}>KES {formatNumber(bet.stake)}</Text>
            <Text style={styles.betCardDate}>{formatDate(bet)}</Text>
          </View>
          {isPending ? (
            <Text style={styles.pendingText}>PENDING</Text>
          ) : (
            <Text style={[styles.resultAmount, { color: resultColor }]}>
              {isWin ? '+' : '−'}KES {formatNumber(isWin ? profit : bet.stake)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [bets, setBets] = useState([]);
  const [timeFilter, setTimeFilter] = useState('All');
  const [outcomeFilter, setOutcomeFilter] = useState('All');
  const [sportFilter, setSportFilter] = useState('All');
  const [selectedBet, setSelectedBet] = useState(null);

  const loadData = useCallback(async (isRefresh) => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    try {
      const [userProfile, userBets] = await Promise.all([getUserProfile(user.uid), getBets(user.uid)]);
      setProfile(userProfile);
      setBets(userBets);
    } catch (err) {
      console.error('Failed to load history data', err);
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

  function handleAvatarPress() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  }

  function handleCardPress(bet) {
    setSelectedBet(bet);
  }

  function handleSheetDismiss() {
    setSelectedBet(null);
  }

  function handleSheetSaved() {
    setSelectedBet(null);
    loadData(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const now = Date.now();
  const filteredBets = bets.filter((bet) => {
    if (!matchesTimeFilter(bet, timeFilter, now)) return false;
    if (outcomeFilter !== 'All' && bet.outcome !== OUTCOME_FILTER_TO_VALUE[outcomeFilter]) return false;
    if (sportFilter !== 'All' && bet.sport !== sportFilter) return false;
    return true;
  });

  const summary = computeSummary(filteredBets);
  const isPositive = summary.netProfit >= 0;
  const avatarInitial = (profile?.username || 'B').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerWrap}>
        <HistoryHeader initial={avatarInitial} onAvatarPress={handleAvatarPress} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <FilterRow options={TIME_FILTERS} value={timeFilter} onSelect={setTimeFilter} />
        <FilterRow options={OUTCOME_FILTERS} value={outcomeFilter} onSelect={setOutcomeFilter} />
        <FilterRow options={SPORT_FILTERS} value={sportFilter} onSelect={setSportFilter} />

        <View style={styles.summaryRow}>
          <View style={[styles.summaryPill, SHADOW.subtle]}>
            <Text style={styles.summaryLabel}>Total Bets</Text>
            <Text style={styles.summaryValue}>{summary.count}</Text>
          </View>
          <View style={[styles.summaryPill, SHADOW.subtle]}>
            <Text style={styles.summaryLabel}>Net Profit</Text>
            <Text style={[styles.summaryValue, { color: isPositive ? COLORS.win : COLORS.loss }]}>
              {isPositive ? '+' : '−'}KES {formatNumber(Math.abs(summary.netProfit))}
            </Text>
          </View>
          <View style={[styles.summaryPill, SHADOW.subtle]}>
            <Text style={styles.summaryLabel}>Win Rate</Text>
            <Text style={styles.summaryValue}>{summary.winRate.toFixed(0)}%</Text>
          </View>
        </View>

        {filteredBets.length === 0 ? (
          <View style={[styles.emptyCard, SHADOW.subtle]}>
            <Text style={styles.emptyText}>No bets match these filters.</Text>
          </View>
        ) : (
          filteredBets.map((bet) => (
            <BetCard key={bet.id} bet={bet} onPress={() => handleCardPress(bet)} />
          ))
        )}
      </ScrollView>

      <OutcomeUpdateSheet
        visible={!!selectedBet}
        bet={selectedBet}
        onDismiss={handleSheetDismiss}
        onSaved={handleSheetSaved}
      />
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
    paddingBottom: 140,
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

  // ─── Filters ───
  filterRow: {
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  filterChip: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: COLORS.onPrimary,
  },

  // ─── Summary pills ───
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  summaryLabel: {
    ...TYPE.labelSm,
    fontSize: 9,
    color: COLORS.outline,
    marginBottom: SPACING.xs,
  },
  summaryValue: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.onSurface,
  },

  // ─── Empty state ───
  emptyCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
  },

  // ─── Bet card ───
  betCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  accentBar: {
    width: 4,
  },
  betCardBody: {
    flex: 1,
    padding: SPACING.md,
  },
  betCardTopRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  tagPill: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
  },
  tagPillText: {
    ...TYPE.labelSm,
    fontSize: 9,
    color: COLORS.onSurfaceVariant,
  },
  tagPillGold: {
    backgroundColor: `${COLORS.secondary}26`,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
  },
  tagPillTextGold: {
    ...TYPE.labelSm,
    fontSize: 9,
    color: COLORS.secondary,
  },
  betCardMatch: {
    ...TYPE.titleMd,
    color: COLORS.onSurface,
  },
  betCardSubtitle: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  betCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING.sm,
  },
  betCardStake: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },
  betCardDate: {
    ...TYPE.labelSm,
    fontSize: 10,
    color: COLORS.outline,
    marginTop: 2,
  },
  resultAmount: {
    fontFamily: FONTS.display,
    fontSize: 18,
  },
  pendingText: {
    ...TYPE.labelSm,
    color: COLORS.pending,
  },
});
