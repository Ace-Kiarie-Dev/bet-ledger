// app/screens/ProfileScreen.js
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, getBets, getStats, updateUserProfile } from '../utils/storage';
import { GoogleGIcon } from './AuthScreen';
import { calculateStats } from './DashboardScreen';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW } from '../constants';

const MAX_USERNAME_LENGTH = 30;

function formatNumber(value) {
  const num = Math.round(Number(value) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Profile shows first+last initials (unlike the single-letter avatars used
// elsewhere) — split on whitespace and take the first character of the
// first two words, so it degrades gracefully for one-word or empty names.
function getInitials(username) {
  const parts = (username || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function formatMemberSince(joinedAt) {
  if (!joinedAt) return null;
  const date = typeof joinedAt.toDate === 'function' ? joinedAt.toDate() : new Date(joinedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [bets, setBets] = useState([]);
  const [stats, setStats] = useState(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  const loadData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [userProfile, userBets, userStats] = await Promise.all([
        getUserProfile(user.uid),
        getBets(user.uid),
        getStats(user.uid),
      ]);
      setProfile(userProfile);
      setBets(userBets);
      setStats(userStats);
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  }

  function handleStartEditUsername() {
    setUsernameInput(profile?.username || '');
    setEditingUsername(true);
  }

  function handleCancelEditUsername() {
    setEditingUsername(false);
  }

  async function handleSaveUsername() {
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid name', 'Username cannot be empty.');
      return;
    }
    if (trimmed.length > MAX_USERNAME_LENGTH) {
      Alert.alert('Invalid name', `Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`);
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    setSavingUsername(true);
    try {
      await updateUserProfile(user.uid, { username: trimmed });
      setProfile((prev) => ({ ...prev, username: trimmed }));
      setEditingUsername(false);
    } catch (err) {
      Alert.alert('Update failed', 'Could not save your username. Please try again.');
    } finally {
      setSavingUsername(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const initials = getInitials(profile?.username);
  const memberSince = formatMemberSince(profile?.joinedAt);
  // Lifetime, not time-filtered — calculateStats itself doesn't scope by range,
  // it just aggregates whatever bets are passed in, same as Dashboard's own call.
  const { netPL, winRate } = calculateStats(bets, null);
  const isPositive = netPL >= 0;
  const longestCleanStreak = stats?.longestCleanStreak ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROFILE</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText} numberOfLines={1}>{initials}</Text>
              </View>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={13} color={COLORS.onPrimary} />
            </View>
          </View>

          {editingUsername ? (
            <View style={styles.usernameEditRow}>
              <TextInput
                style={styles.usernameInput}
                value={usernameInput}
                onChangeText={setUsernameInput}
                placeholder="Your name"
                placeholderTextColor={COLORS.outline}
                maxLength={MAX_USERNAME_LENGTH}
                autoFocus
              />
              <TouchableOpacity onPress={handleCancelEditUsername} hitSlop={8} disabled={savingUsername}>
                <Ionicons name="close" size={18} color={COLORS.onSurfaceVariant} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveUsername} hitSlop={8} disabled={savingUsername}>
                <Text style={styles.usernameSave}>{savingUsername ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={handleStartEditUsername} activeOpacity={0.7}>
              <Text style={styles.username}>{profile?.username || 'Player'}</Text>
              <Ionicons name="pencil-outline" size={14} color={COLORS.primary} style={styles.editIcon} />
            </TouchableOpacity>
          )}
          {memberSince && <Text style={styles.memberSince}>MEMBER SINCE {memberSince}</Text>}

          <View style={styles.googlePill}>
            <GoogleGIcon size={14} />
            <Text style={styles.googlePillText}>Signed in with Google</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Lifetime Stats</Text>
          <Ionicons name="stats-chart-outline" size={16} color={COLORS.outline} />
        </View>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, SHADOW.subtle]}>
            <View style={styles.statIconChip}>
              <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Total Bets Logged</Text>
            <Text style={styles.statValue}>{formatNumber(bets.length)}</Text>
          </View>
          <View style={[styles.statCard, SHADOW.subtle]}>
            <View style={styles.statIconChip}>
              <Ionicons name="trending-up-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Win Rate</Text>
            <Text style={styles.statValue}>{winRate.toFixed(1)}%</Text>
          </View>
          <View style={[styles.statCard, SHADOW.subtle]}>
            <View style={styles.statIconChip}>
              <Ionicons name="flash-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Longest Clean Streak</Text>
            <Text style={styles.statValue}>{longestCleanStreak} Days</Text>
          </View>
          <View style={[styles.statCard, SHADOW.subtle]}>
            <View style={styles.statIconChip}>
              <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Lifetime Net P&L</Text>
            <Text style={[styles.statValue, { color: isPositive ? COLORS.primary : COLORS.loss }]}>
              KES {isPositive ? '+' : '−'}{formatNumber(Math.abs(netPL))}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quick Links</Text>
        <TouchableOpacity
          style={[styles.linkRow, SHADOW.subtle]}
          onPress={() => navigation.navigate('Main', { screen: 'Settings' })}
          activeOpacity={0.8}
        >
          <View style={styles.linkRowLeft}>
            <Ionicons name="settings-outline" size={18} color={COLORS.onSurfaceVariant} />
            <Text style={styles.linkRowText}>Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkRow, SHADOW.subtle]}
          onPress={() => navigation.navigate('Main', { screen: 'History' })}
          activeOpacity={0.8}
        >
          <View style={styles.linkRowLeft}>
            <Ionicons name="time-outline" size={18} color={COLORS.onSurfaceVariant} />
            <Text style={styles.linkRowText}>View Full History</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkRow, SHADOW.subtle]}
          onPress={() => navigation.navigate('About')}
          activeOpacity={0.8}
        >
          <View style={styles.linkRowLeft}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.onSurfaceVariant} />
            <Text style={styles.linkRowText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={COLORS.loss} />
          <Text style={styles.signOutText}>Sign Out</Text>
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
    paddingBottom: 140,
  },

  // ─── Header (Type 2) ───
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontFamily: FONTS.headline,
    fontSize: 18,
    letterSpacing: -0.5,
    color: COLORS.primary,
  },
  headerSpacer: {
    width: 22,
  },

  // ─── Avatar ───
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatarWrap: {
    width: 112,
    height: 112,
    marginBottom: SPACING.md,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: `${COLORS.primary}66`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.headlineBold,
    fontSize: 30,
    color: COLORS.primary,
    textAlign: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    ...TYPE.headlineSm,
    fontSize: 20,
    color: COLORS.onSurface,
  },
  editIcon: {
    marginLeft: SPACING.xs,
  },
  usernameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    maxWidth: '100%',
  },
  usernameInput: {
    ...TYPE.headlineSm,
    fontSize: 20,
    color: COLORS.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
    minWidth: 120,
    paddingVertical: 2,
  },
  usernameSave: {
    ...TYPE.labelSm,
    color: COLORS.primary,
  },
  memberSince: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },
  googlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  googlePillText: {
    ...TYPE.labelSm,
    color: COLORS.onSurface,
    marginLeft: SPACING.xs,
  },

  // ─── Lifetime Stats ───
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  statIconChip: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.primary}26`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.xs,
    textTransform: 'none',
    letterSpacing: 0,
  },
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 18,
    color: COLORS.onSurface,
  },

  // ─── Quick Links ───
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  linkRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  linkRowText: {
    ...TYPE.titleMd,
    fontSize: 14,
    color: COLORS.onSurface,
  },

  // ─── Sign out ───
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.loss,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  signOutText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: COLORS.loss,
  },
});
