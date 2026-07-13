// app/screens/SettingsScreen.js
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, updateUserProfile, getBets } from '../utils/storage';
import {
  scheduleBetReminders,
  cancelBetReminders,
  scheduleStreakAlerts,
  cancelStreakAlerts,
  schedulePerformanceUpdates,
  cancelPerformanceUpdates,
} from '../utils/notifications';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW, TAB_BAR_CLEARANCE } from '../constants';

const NOTIFICATION_HANDLERS = {
  betReminders: { on: scheduleBetReminders, off: cancelBetReminders },
  streakAlerts: { on: scheduleStreakAlerts, off: cancelStreakAlerts },
  performanceUpdates: { on: schedulePerformanceUpdates, off: cancelPerformanceUpdates },
};

const DEFAULT_NOTIFICATIONS = {
  betReminders: true,
  streakAlerts: true,
  performanceUpdates: true,
};

function formatNumber(value) {
  const num = Math.round(Number(value) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Same rolling 7-day window Dashboard's calculateStats uses, so "remaining" here
// matches what Dashboard shows.
function computeWeeklySpend(bets) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return bets
    .filter((b) => new Date(b.date || b.createdAt) >= weekAgo)
    .reduce((sum, b) => sum + Number(b.stake || 0), 0);
}

function ToggleRow({ label, value, onChange, bordered }) {
  return (
    <View style={[styles.toggleRow, bordered && styles.toggleRowBorder]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value === undefined ? true : value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.surfaceHighest, true: `${COLORS.primary}80` }}
        thumbColor={value ? COLORS.primary : COLORS.onSurfaceVariant}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [weeklySpend, setWeeklySpend] = useState(0);
  const [budgetInput, setBudgetInput] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const loadData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [userProfile, bets] = await Promise.all([getUserProfile(user.uid), getBets(user.uid)]);
      setProfile(userProfile);
      setWeeklySpend(computeWeeklySpend(bets));
      setBudgetInput(String(userProfile?.weeklyBudget || ''));
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function persistProfile(updates) {
    const user = auth.currentUser;
    if (!user) return;
    setProfile((prev) => ({ ...prev, ...updates }));
    try {
      await updateUserProfile(user.uid, updates);
    } catch (err) {
      Alert.alert('Update failed', 'Could not save this setting. Please try again.');
    }
  }

  async function handleSaveBudget() {
    const value = Number(budgetInput) || 0;
    setSavingBudget(true);
    await persistProfile({ weeklyBudget: value });
    setSavingBudget(false);
  }

  function handleViewProfile() {
    // TODO: navigate to a real profile screen once one exists — no-op for now.
    Alert.alert('Coming Soon', 'Profile editing is on the way.');
  }

  function handleToggleNotification(key, value) {
    const notifications = { ...(profile?.notifications || DEFAULT_NOTIFICATIONS), [key]: value };
    persistProfile({ notifications });

    const handler = NOTIFICATION_HANDLERS[key];
    const action = value ? handler?.on : handler?.off;
    action?.().catch((err) => console.error(`Failed to ${value ? 'schedule' : 'cancel'} ${key}`, err));
  }

  function handleToggleSupportiveMode(value) {
    persistProfile({ quitModeOn: value });
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
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
  const remaining = Number(budgetInput || 0) - weeklySpend;
  const notifications = profile?.notifications || DEFAULT_NOTIFICATIONS;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ─── Account ─── */}
        <TouchableOpacity style={[styles.card, styles.accountRow]} onPress={handleViewProfile} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{profile?.username || 'Player'}</Text>
            <Text style={styles.accountHint}>Tap to view profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
        </TouchableOpacity>

        {/* ─── Budget ─── */}
        <Text style={styles.sectionLabel}>Weekly Budget</Text>
        <View style={[styles.card, styles.budgetCard]}>
          <View style={styles.budgetInputRow}>
            <Text style={styles.budgetPrefix}>KES</Text>
            <TextInput
              style={styles.budgetInput}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.outline}
              value={budgetInput}
              onChangeText={setBudgetInput}
            />
            <TouchableOpacity onPress={handleSaveBudget} disabled={savingBudget} activeOpacity={0.8}>
              <Text style={styles.budgetSave}>{savingBudget ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.budgetRemaining}>
            {remaining >= 0
              ? `KES ${formatNumber(remaining)} remaining this week`
              : `KES ${formatNumber(Math.abs(remaining))} over this week's budget`}
          </Text>
        </View>

        {/* ─── Notifications ─── */}
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.card}>
          <ToggleRow
            label="Bet Reminders"
            value={notifications.betReminders}
            onChange={(v) => handleToggleNotification('betReminders', v)}
          />
          <ToggleRow
            label="Streak Alerts"
            value={notifications.streakAlerts}
            onChange={(v) => handleToggleNotification('streakAlerts', v)}
            bordered
          />
          <ToggleRow
            label="Performance Updates"
            value={notifications.performanceUpdates}
            onChange={(v) => handleToggleNotification('performanceUpdates', v)}
            bordered
          />
        </View>

        {/* ─── Supportive Mode ─── */}
        <Text style={styles.sectionLabel}>Supportive Mode</Text>
        <View style={styles.card}>
          <View style={styles.supportiveRow}>
            <View style={styles.supportiveText}>
              <Text style={styles.supportiveTitle}>Quit Support</Text>
              <Text style={styles.supportiveDescription}>
                A calmer dashboard and gentler language, for when you want to take a step back.
              </Text>
            </View>
            <Switch
              value={!!profile?.quitModeOn}
              onValueChange={handleToggleSupportiveMode}
              trackColor={{ false: COLORS.surfaceHighest, true: `${COLORS.primary}80` }}
              thumbColor={profile?.quitModeOn ? COLORS.primary : COLORS.onSurfaceVariant}
            />
          </View>
        </View>

        {/* ─── About nav ─── */}
        <TouchableOpacity
          style={[styles.card, styles.navRow]}
          onPress={() => navigation.navigate('About')}
          activeOpacity={0.8}
        >
          <Text style={styles.navRowText}>About</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.outline} />
        </TouchableOpacity>

        {/* ─── Sign out ─── */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
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
    paddingBottom: TAB_BAR_CLEARANCE,
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

  // ─── Shared card ───
  card: {
    ...SHADOW.subtle,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
  },

  // ─── Account ───
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontFamily: FONTS.headlineBold,
    fontSize: 18,
    color: COLORS.primary,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    ...TYPE.titleMd,
    fontSize: 16,
    color: COLORS.onSurface,
  },
  accountHint: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },

  // ─── Budget ───
  budgetCard: {
    borderColor: `${COLORS.secondary}40`,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetPrefix: {
    ...TYPE.bodyMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.secondary,
    marginRight: SPACING.xs,
  },
  budgetInput: {
    flex: 1,
    fontFamily: FONTS.display,
    fontSize: 22,
    color: COLORS.onSurface,
    padding: 0,
  },
  budgetSave: {
    ...TYPE.labelSm,
    color: COLORS.secondary,
  },
  budgetRemaining: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.sm,
  },

  // ─── Toggles ───
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  toggleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  toggleLabel: {
    ...TYPE.titleMd,
    fontSize: 14,
    color: COLORS.onSurface,
  },

  // ─── Supportive mode ───
  supportiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportiveText: {
    flex: 1,
    marginRight: SPACING.md,
  },
  supportiveTitle: {
    ...TYPE.titleMd,
    fontSize: 14,
    color: COLORS.onSurface,
    marginBottom: 2,
  },
  supportiveDescription: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
  },

  // ─── Nav row (About) ───
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRowText: {
    ...TYPE.titleMd,
    fontSize: 14,
    color: COLORS.onSurface,
  },

  // ─── Sign out ───
  signOutButton: {
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
