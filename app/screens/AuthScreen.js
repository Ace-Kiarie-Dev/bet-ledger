// app/screens/AuthScreen.js
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, createUserProfile } from '../utils/storage';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW } from '../constants';

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = height * 0.35;

// ─── Topographic contour overlay (same style as Onboarding, ~15% opacity) ──
function ContourOverlay() {
  const lines = [0.15, 0.32, 0.5, 0.68, 0.85];
  return (
    <Svg width={width} height={HERO_HEIGHT} style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines.map((t, i) => {
        const y = HERO_HEIGHT * t;
        const amp = 14 + (i % 3) * 6;
        const d = `M0,${y} C${width * 0.25},${y - amp} ${width * 0.4},${y + amp} ${width * 0.6},${y} C${width * 0.8},${y - amp} ${width * 0.9},${y + amp} ${width},${y}`;
        return <Path key={i} d={d} stroke="#FFFFFF" strokeWidth={1} fill="none" opacity={0.15} />;
      })}
    </Svg>
  );
}

// ─── Asymmetric organic wave — identical path to OnboardingScreen's HeroWave ─
function HeroWave() {
  const waveHeight = 56;
  const d = `M0,${waveHeight * 0.4}
    C${width * 0.22},${waveHeight * 1.3} ${width * 0.38},0 ${width * 0.62},${waveHeight * 0.5}
    C${width * 0.82},${waveHeight * 1.1} ${width * 0.92},${waveHeight * 0.2} ${width},${waveHeight * 0.65}
    L${width},${waveHeight} L0,${waveHeight} Z`;

  return (
    <Svg width={width} height={waveHeight} style={styles.wave} pointerEvents="none">
      <Path d={d} fill={COLORS.background} />
    </Svg>
  );
}

// ─── Multi-color Google "G" mark ────────────────────────────────────────────
export function GoogleGIcon({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M19.6 10.23c0-.7-.06-1.38-.18-2.03H10v3.83h5.38a4.6 4.6 0 0 1-2 3.02v2.49h3.24a9.77 9.77 0 0 0 2.98-7.31Z" fill="#4285F4" />
      <Path d="M10 20a9.6 9.6 0 0 0 6.62-2.46l-3.24-2.51a6.03 6.03 0 0 1-9-3.15H1.05v2.58A10 10 0 0 0 10 20Z" fill="#34A853" />
      <Path d="M4.38 11.84a6 6 0 0 1 0-3.82V5.44H1.05a10 10 0 0 0 0 8.97l3.33-2.57Z" fill="#FBBC05" />
      <Path d="M10 3.88c1.47 0 2.79.5 3.82 1.5l2.87-2.88A10 10 0 0 0 1.05 5.58l3.33 2.58A6 6 0 0 1 10 3.88Z" fill="#EA4335" />
    </Svg>
  );
}

// ─── Google Sign-In button: press-scale + loading state ────────────────────
function GoogleButton({ loading, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.timing(scale, { toValue: 0.98, duration: 100, useNativeDriver: true }).start();
  }
  function onPressOut() {
    Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={[styles.googleButtonWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.googleButton, SHADOW.subtle]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : (
          <>
            <GoogleGIcon />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Dismissible inline error banner ────────────────────────────────────────
function ErrorBanner({ message, onDismiss }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={8}>
        <Text style={styles.errorDismiss}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

function mapAuthError(err) {
  if (err.code === statusCodes.SIGN_IN_CANCELLED) return null;
  if (err.code === statusCodes.IN_PROGRESS) return null;
  if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services not available on this device';
  }
  return 'Sign-in failed. Please check your connection and try again.';
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();

      if (result.type === 'cancelled') {
        return;
      }

      const idToken = result.data?.idToken;
      if (!idToken) {
        throw new Error('NO_ID_TOKEN');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const { user } = await signInWithCredential(auth, credential);

      const profile = await getUserProfile(user.uid);
      if (!profile) {
        await createUserProfile(user);
      }
      // onAuthStateChanged in AppNavigator handles routing to Main.
    } catch (err) {
      const message = mapAuthError(err);
      if (message) setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[COLORS.primary, '#00C2A8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroZone}
      >
        <ContourOverlay />
        <Text style={styles.wordmark}>Bet Ledger</Text>
        <HeroWave />
      </LinearGradient>

      <View style={styles.contentZone}>
        <View style={styles.contentInner}>
          <Text style={styles.tagline}>Honest bet tracking. No tips, no predictions.</Text>

          <View style={styles.spacer} />

          <GoogleButton loading={loading} onPress={handleGoogleSignIn} />

          {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

          <Text style={styles.finePrint}>
            BY CONTINUING, YOU AGREE THIS APP DOESN'T PROVIDE BETTING TIPS OR PREDICTIONS
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ─── Hero zone ──────────────────────────────────────────────────────────
  heroZone: {
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  wordmark: {
    fontFamily: FONTS.headline,
    fontSize: 40,
    color: COLORS.onPrimary,
    letterSpacing: -1.6,
  },
  wave: {
    position: 'absolute',
    bottom: -1,
    left: 0,
  },

  // ─── Content zone ───────────────────────────────────────────────────────
  contentZone: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  contentInner: {
    width: '100%',
    alignItems: 'center',
  },
  tagline: {
    fontFamily: FONTS.body,
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
  },
  spacer: {
    height: SPACING.xxl * 2,
  },

  // ─── Google button ──────────────────────────────────────────────────────
  googleButtonWrap: {
    alignSelf: 'stretch',
    marginHorizontal: SPACING.lg,
  },
  googleButton: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
  },
  googleButtonText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: '#132030',
    marginLeft: 12,
  },

  // ─── Error banner ───────────────────────────────────────────────────────
  errorBanner: {
    alignSelf: 'stretch',
    marginHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 181, 178, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.tertiary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  errorText: {
    ...TYPE.bodyMd,
    color: COLORS.tertiary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  errorDismiss: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
    color: COLORS.tertiary,
  },

  // ─── Fine print ─────────────────────────────────────────────────────────
  finePrint: {
    ...TYPE.labelSm,
    lineHeight: 16,
    color: COLORS.outline,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: SPACING.lg,
  },
});
