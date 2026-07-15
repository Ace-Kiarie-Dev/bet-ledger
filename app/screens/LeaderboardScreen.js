// app/screens/LeaderboardScreen.js
//
// FOLLOW-UP (deliberately not designed here — flagging, not deciding):
// Real cross-user leaderboard rendering needs, in order:
//   1. The `leaderboard/cleanStreak` and `leaderboard/budgetStreak` collections
//      actually built out (they don't exist in Firestore yet).
//   2. Firestore security rules written and published — there are currently NO
//      rules governing per-user data isolation, so writing a cross-user-readable
//      leaderboard doc before rules exist is a real exposure risk, not just a
//      missing feature.
//   3. A decision on how/when streak data gets written to those collections:
//      client-side on every bet/outcome update, vs. a scheduled Cloud Function
//      recompute. This has real tradeoffs (write amplification & trust boundary
//      vs. latency/staleness) and shouldn't be picked implicitly by whoever builds
//      the next screen that touches it.
// Until all three are resolved, this screen only ever shows the current user's
// own row, computed from their own data — never fabricated other-user rows.
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase';
import { getUserProfile, getBets, getStats } from '../utils/storage';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW } from '../constants';

const TABS = ['Clean Streak', 'Budget Streak'];

// Consecutive non-loss bets counting back from the most recent (bets arrive
// newest-first from getBets) — mirrors Dashboard's lossStreak logic, inverted.
function computeCleanStreak(bets) {
  let streak = 0;
  for (const bet of bets) {
    if (bet.outcome === 'loss') break;
    streak += 1;
  }
  return streak;
}

function HeaderRow({ initial, onAvatarPress }) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.brandRow}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.logoMark} resizeMode="contain" />
        <Text style={styles.wordmark}>BET LEDGER</Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={onAvatarPress} hitSlop={8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [cleanStreak, setCleanStreak] = useState(0);
  const [budgetStreak, setBudgetStreak] = useState(null); // null = not tracked yet
  const [activeTab, setActiveTab] = useState('Clean Streak');

  const loadData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [userProfile, bets, stats] = await Promise.all([
        getUserProfile(user.uid),
        getBets(user.uid),
        getStats(user.uid),
      ]);
      setProfile(userProfile);
      setCleanStreak(stats?.currentCleanStreak ?? computeCleanStreak(bets));
      setBudgetStreak(stats?.budgetAdherenceStreak ?? null);
    } catch (err) {
      console.error('Failed to load leaderboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function handleAvatarPress() {
    navigation.navigate('Profile');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const avatarInitial = (profile?.username || 'B').charAt(0).toUpperCase();
  const isCleanTab = activeTab === 'Clean Streak';
  const yourValue = isCleanTab ? cleanStreak : budgetStreak;
  const yourValueLabel = yourValue === null ? '—' : yourValue;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerWrap}>
        <HeaderRow initial={avatarInitial} onAvatarPress={handleAvatarPress} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.emptyCard, SHADOW.subtle]}>
          <Ionicons name="people-outline" size={28} color={COLORS.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>Leaderboard opens once more bettors join</Text>
          <Text style={styles.emptySubtext}>
            You'll see rankings here once there are enough players to compare against.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Your Standing</Text>
        <View style={[styles.yourRow, SHADOW.subtle]}>
          <View style={styles.yourRank}>
            <Text style={styles.yourRankText}>—</Text>
          </View>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>{avatarInitial}</Text>
          </View>
          <Text style={styles.yourName} numberOfLines={1}>{profile?.username || 'You'}</Text>
          <Text style={styles.yourStreak}>
            {yourValueLabel}{typeof yourValueLabel === 'number' ? (isCleanTab ? ' bets' : ' wks') : ''}
          </Text>
        </View>
        {!isCleanTab && budgetStreak === null && (
          <Text style={styles.notTrackedNote}>Budget streak history isn't tracked yet.</Text>
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
    paddingBottom: 140,
  },

  // ─── Header (Type 1) ───
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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

  // ─── Tabs ───
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
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

  // ─── Empty state (honest, no fabricated rows) ───
  emptyCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPE.titleMd,
    color: COLORS.onSurface,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },

  // ─── Your standing ───
  sectionLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
  },
  yourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}14`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  yourRank: {
    width: 28,
    alignItems: 'center',
  },
  yourRankText: {
    ...TYPE.labelSm,
    color: COLORS.outline,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarSmallText: {
    fontFamily: FONTS.headlineBold,
    fontSize: 12,
    color: COLORS.primary,
  },
  yourName: {
    ...TYPE.titleMd,
    fontSize: 14,
    color: COLORS.onSurface,
    flex: 1,
  },
  yourStreak: {
    fontFamily: FONTS.display,
    fontSize: 16,
    color: COLORS.primary,
  },
  notTrackedNote: {
    ...TYPE.bodyMd,
    fontSize: 11,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
});
