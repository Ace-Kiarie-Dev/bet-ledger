// app/navigation/AppNavigator.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { COLORS, TYPE, SHADOW } from '../constants';

// Auth screens
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import SplashScreen from '../screens/SplashScreen';

// App screens
import DashboardScreen from '../screens/DashboardScreen';
import AddBetScreen from '../screens/AddBetScreen';
import HistoryScreen from '../screens/HistoryScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Custom Tab Bar (floating glass pill, per style guide section 6) ───────
function CustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'Dashboard', icon: 'home-outline',      label: 'Dashboard' },
    { name: 'History',   icon: 'time-outline',      label: 'History'   },
    { name: 'AddBet',    icon: 'add',               label: 'Add Bet', isCenter: true },
    { name: 'Insights',  icon: 'bar-chart-outline',  label: 'Insights'  },
    { name: 'Settings',  icon: 'person-outline',     label: 'Settings'  },
  ];

  return (
    <View style={styles.tabBarWrap}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const tab = tabs[index];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (tab.isCenter) {
            return (
              <TouchableOpacity key={route.key} onPress={onPress} style={styles.centerTab} activeOpacity={0.85}>
                <View style={styles.centerButton}>
                  <Ionicons name={tab.icon} size={28} color={COLORS.onPrimary} />
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <View style={[styles.iconChip, isFocused && styles.iconChipActive]}>
                <Ionicons
                  name={tab.icon}
                  size={20}
                  color={isFocused ? COLORS.primary : COLORS.onSurfaceVariant}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Tab Navigator ──────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard"  component={DashboardScreen} />
      <Tab.Screen name="History"    component={HistoryScreen} />
      <Tab.Screen name="AddBet"     component={AddBetScreen} />
      <Tab.Screen name="Insights"   component={InsightsScreen} />
      <Tab.Screen name="Settings"   component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ──────────────────────────────────────────────────────────
export default function AppNavigator() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, []);

  if (user === undefined) {
    // Splash is purely the visual shown during this initial auth-state check —
    // it doesn't own any routing decision itself.
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Floating wrapper — positions the glass pill above content, off the screen edge
  tabBarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 8,
    ...SHADOW.ambient,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    ...TYPE.labelSm,
    fontSize: 9,
    letterSpacing: 0.8,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    backgroundColor: `${COLORS.primary}26`, // ~15% opacity teal chip
  },
  // Center Add Bet button — raised FAB-style, sits above the pill
  centerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.ambient,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
  },
});