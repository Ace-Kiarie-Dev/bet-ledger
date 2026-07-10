// app/screens/AddBetScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { addBet, getUserProfile } from '../utils/storage';
import { scheduleMatchReminder } from '../utils/notifications';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW, SPORTS, PLATFORMS, SPORT_MARKETS, DEFAULT_MARKETS } from '../constants';

const SPORT_ICONS = {
  Football: 'football-outline',
  Basketball: 'basketball-outline',
  Tennis: 'tennisball-outline',
};

const SELECTION_PLACEHOLDERS = {
  Football: {
    '1X2': 'e.g. Arsenal to Win',
    'Double Chance': 'e.g. Arsenal or Draw',
    'Over/Under': 'e.g. Over 2.5 Goals',
    BTTS: 'e.g. Yes',
    Handicap: 'e.g. Arsenal -1.5',
    'Correct Score': 'e.g. 2-1',
    Other: 'e.g. Corner count, cards, etc.',
  },
  Basketball: {
    Moneyline: 'e.g. Lakers to Win',
    'Over/Under': 'e.g. Over 220.5 Points',
    Handicap: 'e.g. Lakers -5.5',
    'Player Prop': 'e.g. LeBron James Over 25.5 Pts',
    Other: 'e.g. Describe your selection',
  },
  Tennis: {
    Moneyline: 'e.g. Sinner to Win',
    'Over/Under': 'e.g. Over 22.5 Games',
    Handicap: 'e.g. Alcaraz -3.5 Games',
    'Set Betting': 'e.g. Sinner to Win 3-1',
    Other: 'e.g. Total aces, etc.',
  },
};

function getMarketsForSport(sport) {
  return SPORT_MARKETS[sport] || DEFAULT_MARKETS;
}

function getSelectionPlaceholder(sport, market) {
  return SELECTION_PLACEHOLDERS[sport]?.[market] || 'e.g. Describe your selection';
}

function formatNumber(value) {
  const num = Math.round(Number(value) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatMatchTime(date) {
  const datePart = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timePart = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

export default function AddBetScreen() {
  const navigation = useNavigation();

  const [sport, setSport] = useState(SPORTS[0]);
  const [event, setEvent] = useState('');
  const [market, setMarket] = useState(getMarketsForSport(SPORTS[0])[0]);
  const [selection, setSelection] = useState('');
  const [matchTime, setMatchTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // Android steps through date -> time
  const [stake, setStake] = useState('');
  const [odds, setOdds] = useState('');
  const [platform, setPlatform] = useState(null);
  const [outcome, setOutcome] = useState('pending');
  const [saving, setSaving] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [savedBetId, setSavedBetId] = useState(null);
  const [savedBackdated, setSavedBackdated] = useState(false);

  const stakeNum = parseFloat(stake) || 0;
  const oddsNum = parseFloat(odds) || 0;
  const payout = stakeNum * oddsNum;
  const profit = payout - stakeNum;
  const isPast = matchTime.getTime() < Date.now();
  const currentMarkets = getMarketsForSport(sport);

  function handleSelectSport(nextSport) {
    setSport(nextSport);
    setMarket(getMarketsForSport(nextSport)[0]);
    setSelection('');
  }

  function openPicker() {
    setPickerMode(Platform.OS === 'android' ? 'date' : 'datetime');
    setShowPicker(true);
  }

  function onChangeDateTime(pickerEvent, selected) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (pickerEvent.type === 'dismissed' || !selected) return;

      if (pickerMode === 'date') {
        const next = new Date(matchTime);
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        setMatchTime(next);
        setPickerMode('time');
        setShowPicker(true);
      } else {
        const next = new Date(matchTime);
        next.setHours(selected.getHours(), selected.getMinutes());
        setMatchTime(next);
      }
    } else if (selected) {
      setMatchTime(selected);
    }
  }

  function handleSelectOutcome(value) {
    if (value === 'win' || value === 'loss') {
      if (!isPast) return;
      Alert.alert(
        'Confirm Result',
        "This can't be changed after saving — confirm the result?",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => setOutcome(value) },
        ]
      );
    } else {
      setOutcome(value);
    }
  }

  async function handleSave() {
    if (!event.trim()) return Alert.alert('Missing info', 'Enter the event/match.');
    if (!selection.trim()) return Alert.alert('Missing info', 'Enter your selection.');
    if (!stakeNum) return Alert.alert('Missing info', 'Enter a stake amount.');
    if (!oddsNum) return Alert.alert('Missing info', 'Enter the odds.');
    if (!platform) return Alert.alert('Missing info', 'Select a bookmaker.');

    const user = auth.currentUser;
    if (!user) return;

    const backdated = (outcome === 'win' || outcome === 'loss') && isPast;

    setSaving(true);
    try {
      const betData = {
        sport,
        teams: event.trim(),
        market,
        selection: selection.trim(),
        matchTime: matchTime.toISOString(),
        date: matchTime.toISOString(),
        stake: stakeNum,
        odds: oddsNum,
        platform,
        outcome,
        ...(backdated ? { backdated: true, outcomeSetAt: serverTimestamp() } : {}),
      };
      let reminderNotificationId = null;
      if (!backdated) {
        const profile = await getUserProfile(user.uid).catch(() => null);
        if (profile?.notifications?.betReminders) {
          reminderNotificationId = await scheduleMatchReminder(betData).catch((err) => {
            console.error('Failed to schedule match reminder', err);
            return null;
          });
        }
      }

      const id = await addBet(user.uid, {
        ...betData,
        ...(reminderNotificationId ? { reminderNotificationId } : {}),
      });
      setSavedBetId(id);
      setSavedBackdated(backdated);
      setSuccessVisible(true);
    } catch (err) {
      Alert.alert('Save failed', 'Could not save this bet. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    setSuccessVisible(false);
    navigation.navigate('Dashboard');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LOG BET</Text>
        <TouchableOpacity style={styles.bellButton} hitSlop={8}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Select Sport</Text>
          <View style={styles.chipRow}>
            {SPORTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, sport === s && styles.chipActive]}
                onPress={() => handleSelectSport(s)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, sport === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Event / Match</Text>
          <View style={styles.fieldCard}>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Arsenal vs Chelsea"
              placeholderTextColor={COLORS.outline}
              value={event}
              onChangeText={setEvent}
            />
            <Ionicons name={SPORT_ICONS[sport] || 'football-outline'} size={20} color={COLORS.primary} />
          </View>

          <Text style={styles.sectionLabel}>Market</Text>
          <View style={styles.chipRow}>
            {currentMarkets.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, market === m && styles.chipActive]}
                onPress={() => setMarket(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, market === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.fieldCard, styles.selectionField]}>
            <TextInput
              style={styles.fieldInput}
              placeholder={getSelectionPlaceholder(sport, market)}
              placeholderTextColor={COLORS.outline}
              value={selection}
              onChangeText={setSelection}
            />
          </View>

          <Text style={styles.sectionLabel}>Match Date & Time</Text>
          <TouchableOpacity style={styles.fieldCard} onPress={openPicker} activeOpacity={0.8}>
            <Text style={styles.fieldValueText}>{formatMatchTime(matchTime)}</Text>
            <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          {showPicker && Platform.OS === 'android' && (
            <DateTimePicker value={matchTime} mode={pickerMode} display="default" onChange={onChangeDateTime} />
          )}

          {Platform.OS === 'ios' && (
            <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
              <View style={styles.pickerBackdrop}>
                <View style={styles.pickerSheet}>
                  <DateTimePicker
                    value={matchTime}
                    mode="datetime"
                    display="spinner"
                    onChange={onChangeDateTime}
                    textColor={COLORS.onSurface}
                  />
                  <TouchableOpacity style={styles.pickerDone} onPress={() => setShowPicker(false)} activeOpacity={0.85}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          <View style={styles.gridRow}>
            <View style={styles.gridCard}>
              <Text style={styles.gridCaption}>KES</Text>
              <TextInput
                style={styles.gridInput}
                placeholder="0"
                placeholderTextColor={COLORS.outline}
                keyboardType="numeric"
                value={stake}
                onChangeText={setStake}
              />
              <Text style={styles.gridLabel}>Stake</Text>
            </View>
            <View style={styles.gridCard}>
              <Text style={styles.gridCaption}>Decimal</Text>
              <TextInput
                style={styles.gridInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.outline}
                keyboardType="decimal-pad"
                value={odds}
                onChangeText={setOdds}
              />
              <Text style={styles.gridLabel}>Odds</Text>
            </View>
          </View>

          <View style={[styles.payoutCard, SHADOW.ambient]}>
            <View style={styles.payoutGlowOuter} />
            <View style={styles.payoutGlowInner} />
            <Text style={styles.payoutLabel}>Potential Payout</Text>
            <View style={styles.payoutRow}>
              <Text style={styles.payoutCurrency}>KES</Text>
              <Text style={styles.payoutAmount}>{formatNumber(payout)}</Text>
            </View>
            <View style={styles.profitBadge}>
              <Text style={styles.profitBadgeText}>+{formatNumber(profit)} PROFIT</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Bookmaker</Text>
          <View style={styles.chipRow}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, platform === p && styles.chipActive]}
                onPress={() => setPlatform(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, platform === p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Outcome</Text>
          <View style={styles.chipRow}>
            {['win', 'loss', 'pending'].map((value) => {
              const disabled = (value === 'win' || value === 'loss') && !isPast;
              const active = outcome === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
                  onPress={() => handleSelectOutcome(value)}
                  activeOpacity={disabled ? 1 : 0.8}
                  disabled={disabled}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive, disabled && styles.chipTextDisabled]}>
                    {value.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!isPast && (
            <Text style={styles.helperText}>Outcome available once the match has started.</Text>
          )}

          <TouchableOpacity
            style={[styles.saveButton, SHADOW.subtle]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Bet'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.successBackdrop}>
          <View style={[styles.successCard, SHADOW.ambient]}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.primary} />
            <Text style={styles.successTitle}>Bet Logged</Text>
            <Text style={styles.successSubtext}>Your entry has been recorded honestly.</Text>

            <View style={[styles.statusPill, savedBackdated && styles.statusPillGold]}>
              <Text style={[styles.statusPillText, savedBackdated && styles.statusPillTextGold]}>
                {savedBackdated ? 'LOGGED LATE' : 'RECORDED'}
              </Text>
            </View>

            {savedBetId && (
              <Text style={styles.referenceText}>REF · {savedBetId.slice(0, 8).toUpperCase()}</Text>
            )}

            <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.85}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 140,
  },

  // ─── Header (Type 2: back arrow, title, bell/spacer) ───
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
  bellButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Section labels ───
  sectionLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  // ─── Chips (sport / bookmaker / outcome) ───
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    ...TYPE.titleMd,
    fontSize: 14,
    color: COLORS.onSurface,
  },
  chipTextActive: {
    color: COLORS.onPrimary,
    fontFamily: FONTS.bodySemiBold,
  },
  chipTextDisabled: {
    color: COLORS.outline,
  },

  // ─── Glass field (event input, date/time field) ───
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  fieldInput: {
    ...TYPE.titleMd,
    flex: 1,
    color: COLORS.onSurface,
  },
  fieldValueText: {
    ...TYPE.titleMd,
    color: COLORS.onSurface,
  },
  selectionField: {
    marginTop: SPACING.sm,
  },

  // ─── iOS date/time picker sheet ───
  pickerBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 15, 30, 0.6)',
  },
  pickerSheet: {
    backgroundColor: COLORS.surfaceLow,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
  },
  pickerDone: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  pickerDoneText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onPrimary,
  },

  // ─── Stake / Odds grid ───
  gridRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  gridCard: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  gridCaption: {
    ...TYPE.labelSm,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  gridInput: {
    fontFamily: FONTS.display,
    fontSize: 28,
    color: COLORS.onSurface,
    padding: 0,
  },
  gridLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },

  // ─── Potential payout hero card ───
  payoutCard: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    alignItems: 'center',
    overflow: 'hidden',
  },
  payoutGlowOuter: {
    position: 'absolute',
    top: -60,
    left: '50%',
    marginLeft: -110,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: COLORS.primary,
    opacity: 0.1,
  },
  payoutGlowInner: {
    position: 'absolute',
    top: -20,
    left: '50%',
    marginLeft: -65,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.primary,
    opacity: 0.18,
  },
  payoutLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  payoutCurrency: {
    ...TYPE.bodyMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.primary,
    marginRight: SPACING.xs,
    marginBottom: 8,
  },
  payoutAmount: {
    fontFamily: FONTS.display,
    fontSize: 44,
    color: COLORS.primary,
  },
  profitBadge: {
    backgroundColor: `${COLORS.primary}26`,
    borderRadius: 999,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  profitBadgeText: {
    ...TYPE.labelSm,
    fontFamily: FONTS.display,
    letterSpacing: 0,
    color: COLORS.primary,
  },

  // ─── Helper text (outcome lock) ───
  helperText: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.sm,
  },

  // ─── Save CTA ───
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  saveButtonText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onPrimary,
  },

  // ─── Success modal ───
  successBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 15, 30, 0.75)',
    padding: SPACING.xl,
  },
  successCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.surfaceLow,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  successTitle: {
    ...TYPE.headlineSm,
    color: COLORS.onSurface,
    marginTop: SPACING.md,
  },
  successSubtext: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  statusPill: {
    backgroundColor: `${COLORS.primary}26`,
    borderRadius: 999,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statusPillText: {
    ...TYPE.labelSm,
    color: COLORS.primary,
  },
  statusPillGold: {
    backgroundColor: `${COLORS.secondary}26`,
  },
  statusPillTextGold: {
    color: COLORS.secondary,
  },
  referenceText: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.lg,
  },
  doneButton: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onPrimary,
  },
});
