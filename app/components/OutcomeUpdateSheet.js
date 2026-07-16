// app/components/OutcomeUpdateSheet.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { updateBet } from '../utils/storage';
import { COLORS, FONTS, TYPE, SPACING, RADIUS } from '../constants';

const SPORT_ICONS = {
  Football: 'football-outline',
  Basketball: 'basketball-outline',
  Tennis: 'tennisball-outline',
};

const OUTCOME_ACTIVE_COLORS = {
  win: COLORS.win,
  loss: COLORS.loss,
  pending: COLORS.pending,
};

function formatNumber(value) {
  const num = Math.round(Number(value) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getSubtitle(bet) {
  if (bet.market && bet.selection) return `${bet.market}: ${bet.selection}`;
  return bet.sport || null;
}

// Reused for both taps from HistoryScreen: a PENDING bet opens this in editable mode
// (Win/Loss/Pending selector + Save), a settled (Win/Loss) bet opens it read-only —
// the outcome selector/save action is only ever rendered when bet.outcome === 'pending'.
// This is the UI-level enforcement of the one-way lock; storage.js enforces it again
// server-side via LOCKED_FIELDS, but a settled bet never even reaches a save path here.
export default function OutcomeUpdateSheet({ visible, bet, onDismiss, onSaved }) {
  const [selectedOutcome, setSelectedOutcome] = useState(bet?.outcome || 'pending');
  const [saving, setSaving] = useState(false);

  if (!bet) return null;

  const isPending = bet.outcome === 'pending';
  const subtitle = getSubtitle(bet);

  function handleSelectOutcome(value) {
    if (value === 'win' || value === 'loss') {
      Alert.alert(
        'Confirm Result',
        "This can't be changed after saving — confirm the result?",
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => setSelectedOutcome(value) },
        ]
      );
    } else {
      setSelectedOutcome(value);
    }
  }

  async function handleSave() {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await updateBet(user.uid, bet.id, { outcome: selectedOutcome });
      onSaved?.();
    } catch (err) {
      Alert.alert('Save failed', err.message || 'Could not update this bet. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.summaryRow}>
            <View style={styles.sportIconCircle}>
              <Ionicons name={SPORT_ICONS[bet.sport] || 'ellipse-outline'} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.matchName} numberOfLines={1}>{bet.teams}</Text>
              {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
              <Text style={styles.stakeLine}>KES {formatNumber(bet.stake)} · {bet.platform}</Text>
            </View>
          </View>

          {isPending ? (
            <>
              <Text style={styles.sheetTitle}>Update Outcome</Text>
              <View style={styles.chipRow}>
                {['win', 'loss', 'pending'].map((value) => {
                  const active = selectedOutcome === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.chip,
                        active && { backgroundColor: OUTCOME_ACTIVE_COLORS[value], borderColor: OUTCOME_ACTIVE_COLORS[value] },
                      ]}
                      onPress={() => handleSelectOutcome(value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{value.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Outcome'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onDismiss} hitSlop={8} style={styles.dismissLink}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sheetTitle}>Bet Details</Text>
              <View
                style={[
                  styles.resultBadge,
                  { backgroundColor: bet.outcome === 'win' ? `${COLORS.win}26` : `${COLORS.loss}26` },
                ]}
              >
                <Text style={[styles.resultBadgeText, { color: bet.outcome === 'win' ? COLORS.win : COLORS.loss }]}>
                  {bet.outcome.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.lockedNote}>This bet is settled and can no longer be edited.</Text>

              <TouchableOpacity style={styles.saveButton} onPress={onDismiss} activeOpacity={0.85}>
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 15, 30, 0.7)',
  },
  sheet: {
    backgroundColor: COLORS.surfaceLow,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}26`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  summaryInfo: {
    flex: 1,
  },
  matchName: {
    ...TYPE.titleMd,
    fontSize: 16,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  stakeLine: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.outline,
    marginTop: 2,
  },
  sheetTitle: {
    ...TYPE.headlineSm,
    fontSize: 18,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    ...TYPE.labelSm,
    color: COLORS.onSurfaceVariant,
  },
  chipTextActive: {
    color: COLORS.onPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  saveButtonText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.onPrimary,
  },
  dismissLink: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  dismissText: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
  },
  resultBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  resultBadgeText: {
    ...TYPE.labelSm,
  },
  lockedNote: {
    ...TYPE.bodyMd,
    fontSize: 12,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
});
