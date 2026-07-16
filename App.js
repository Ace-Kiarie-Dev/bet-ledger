// App.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Barlow_800ExtraBold } from '@expo-google-fonts/barlow';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AppNavigator from './app/navigation/AppNavigator';
import { COLORS } from './app/constants';

GoogleSignin.configure({
  webClientId: '537494078170-tcafjdu2riig4ub56sb0um6gin6aoll1.apps.googleusercontent.com',
});

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Barlow_800ExtraBold,
  });

  // Notification permission is requested from AppNavigator instead, after
  // onboarding/auth resolve — see docs/sessions/DECISIONS.md. Cold-start
  // (here, pre-auth) is not the right moment to show that OS prompt.

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <AppNavigator />;
}