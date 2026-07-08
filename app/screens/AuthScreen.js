// app/screens/AuthScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile, createUserProfile } from '../utils/storage';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOW } from '../constants';

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = result?.data?.idToken ?? result?.idToken;

      if (!idToken) {
        throw new Error('NO_ID_TOKEN');
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const { user } = await signInWithCredential(auth, credential);

      const profile = await getUserProfile(user.uid);
      if (!profile) {
        const username =
          user.displayName || (user.email ? user.email.split('@')[0] : 'Player');
        await createUserProfile(user.uid, { username });
      }
      // Navigation to Main happens automatically via onAuthStateChanged in AppNavigator.
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  function mapAuthError(err) {
    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      return null; // user cancelled — no need to surface an error
    }
    if (err.code === statusCodes.IN_PROGRESS) {
      return 'Sign-in is already in progress.';
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services is unavailable on this device.';
    }
    if (err.message === 'NO_ID_TOKEN') {
      return "Couldn't complete Google sign-in. Please try again.";
    }
    if (err.code?.startsWith?.('auth/network-request-failed')) {
      return 'Network error. Check your connection and try again.';
    }
    return "Sign-in failed. Please try again.";
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.brand}>
          <Text style={styles.wordmark}>Bet Ledger</Text>
          <Text style={styles.tagline}>
            Track every bet. Own every outcome.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)} hitSlop={8}>
              <Text style={styles.errorDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.googleButtonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#1F1F1F" />
          ) : (
            <>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.finePrint}>
          By continuing, you agree this app doesn't provide betting tips or predictions
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  wordmark: {
    fontFamily: FONTS.headline,
    fontSize: 32,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  tagline: {
    ...TYPE.bodyMd,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  errorBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.tertiary}26`, // ~15% opacity coral tint
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    ...TYPE.bodyMd,
    color: COLORS.tertiary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  errorDismiss: {
    color: COLORS.tertiary,
    fontSize: 16,
    fontFamily: FONTS.bodySemiBold,
  },
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOW.subtle,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleG: {
    fontFamily: FONTS.headlineBold,
    fontSize: 18,
    color: '#4285F4',
    marginRight: SPACING.sm,
  },
  googleButtonText: {
    ...TYPE.titleMd,
    fontFamily: FONTS.bodySemiBold,
    color: '#1F1F1F',
  },
  finePrint: {
    ...TYPE.labelSm,
    color: COLORS.outline,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
