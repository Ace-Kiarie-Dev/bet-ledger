// app/navigation/AppNavigator.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { COLORS, FONTS, RADIUS, SHADOW } from '../constants';

// Auth screens
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';

// App screens
import DashboardScreen from '../screens/DashboardScreen';
import AddBetScreen from '../screens/AddBetScreen';
import HistoryScreen from '../screens/HistoryScreen';
import InsightsScreen from '../screens/InsightsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const tabs = [
    { name: 'Dashboard', icon: '▦', label: 'Dashboard' },
    { name: 'History',   icon: '◷', label: 'History'   },
    { name: 'AddBet',    icon: '+', label: 'Add Bet', isCenter: true },
    { name: 'Insights',  icon: '↗', label: 'Insights'  },
    { name: 'Settings',  icon: '⚙', label: 'Settings'  },
  ];

  return (
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
                <Text style={styles.centerIcon}>+</Text>
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.tab, isFocused && styles.tabActive]}
            activeOpacity={0.7}
          >
            <TabIcon name={route.name} focused={isFocused} />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Tab Icons (Material-style using text — swap for vector icons later) ────
function TabIcon({ name, focused }) {
  const color = focused ? COLORS.primary : '#4A5568';
  const icons = {
    Dashboard: { filled: '⊞', outline: '⊟' },
    History:   { filled: '◉', outline: '○' },
    Insights:  { filled: '▣', outline: '▢' },
    Settings:  { filled: '◈', outline: '◇' },
  };

  // Use expo vector icons if available
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={{ color, fontSize: 18 }}>
        {focused ? icons[name]?.filled : icons[name]?.outline}
      </Text>
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
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: `${COLORS.background}E6`, // 90% opacity
    borderTopWidth: 1,
    borderTopColor: `${COLORS.primary}26`,      // 15% opacity teal
    paddingBottom: 24,
    paddingTop: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...SHADOW.ambient,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: RADIUS.lg,
  },
  tabActive: {
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.lg,
  },
  tabLabel: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#4A5568',
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {},
  // Center Add Bet button
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
  centerIcon: {
    color: COLORS.onPrimary,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
});