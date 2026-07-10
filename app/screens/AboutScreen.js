// app/screens/AboutScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW } from '../constants';

// Behance has no dedicated Ionicons glyph — "color-palette-outline" stands in as the
// closest available "design portfolio" icon.
const SOCIAL_LINKS = [
  { label: 'LinkedIn', icon: 'logo-linkedin', url: 'https://www.linkedin.com/in/peter-kiarie' },
  { label: 'X', icon: 'logo-twitter', url: 'https://x.com/Ace_Kiarie' },
  { label: 'Instagram', icon: 'logo-instagram', url: 'https://www.instagram.com/ace_kiarie' },
  { label: 'Behance', icon: 'color-palette-outline', url: 'https://www.behance.net/peterkiarie3' },
];

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function AboutScreen() {
  const navigation = useNavigation();

  function handleOpenLink(url) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ABOUT</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bioSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>PK</Text>
          </View>
          <Text style={styles.name}>Peter Kiarie</Text>
          <Text style={styles.role}>Developer & Designer, Nesture</Text>
          <Text style={styles.bio}>
            Building tools that reward honesty over hype. BetLedger is Nesture's flagship
            product — a bet tracker that helps you see your numbers clearly, win or lose.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Connect</Text>
        <View style={styles.linksRow}>
          {SOCIAL_LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={[styles.linkChip, SHADOW.subtle]}
              onPress={() => handleOpenLink(link.url)}
              activeOpacity={0.8}
            >
              <Ionicons name={link.icon} size={16} color={COLORS.primary} />
              <Text style={styles.linkChipText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>NESTURE</Text>
          <Text style={styles.footerVersion}>BetLedger v{APP_VERSION}</Text>
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

  // ─── Bio ───
  bioSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${COLORS.primary}26`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontFamily: FONTS.headlineBold,
    fontSize: 24,
    color: COLORS.primary,
  },
  name: {
    ...TYPE.headlineSm,
    fontSize: 20,
    color: COLORS.onSurface,
  },
  role: {
    ...TYPE.bodyMd,
    fontSize: 13,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  bio: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
  },

  // ─── Social links ───
  sectionLabel: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  linkChipText: {
    ...TYPE.labelSm,
    color: COLORS.onSurface,
    marginLeft: SPACING.xs,
  },

  // ─── Footer ───
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerBrand: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    letterSpacing: 2,
  },
  footerVersion: {
    ...TYPE.bodyMd,
    fontSize: 11,
    color: COLORS.outline,
    marginTop: SPACING.xs,
  },
});
