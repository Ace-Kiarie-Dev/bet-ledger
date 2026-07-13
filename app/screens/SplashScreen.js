// app/screens/SplashScreen.js
// Purely presentational — the auth-check/routing decision lives in AppNavigator.js,
// which renders this component while it waits on the initial onAuthStateChanged result.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Image } from 'react-native';
import { COLORS, FONTS, TYPE, SPACING } from '../constants';

function Dot({ delay }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity]);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />

      <Image source={require('../../assets/splash-logo.png')} style={styles.logoMark} resizeMode="contain" />

      <View style={styles.dotsRow}>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>

      <Text style={styles.tagline}>Stop guessing. Start knowing.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.primary,
    opacity: 0.08,
  },
  glowInner: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.primary,
    opacity: 0.16,
  },
  logoMark: {
    width: 72,
    height: 72,
    marginBottom: SPACING.xl,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  tagline: {
    position: 'absolute',
    bottom: SPACING.xxl,
    ...TYPE.bodyMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.onSurfaceVariant,
  },
});
