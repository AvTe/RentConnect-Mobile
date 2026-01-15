import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Text, Platform, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Auth Screens
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TenantLeadScreen from '../screens/TenantLeadScreen';

// Tenant Screens
import TenantDashboardScreen from '../screens/tenant/TenantDashboardScreen';
import MyRequestsScreen from '../screens/tenant/MyRequestsScreen';
import MessagesScreen from '../screens/tenant/MessagesScreen';

// Profile & Settings Screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

// Support Screens
import SupportScreen from '../screens/support/SupportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#FE9200',
  primaryLight: '#FFF5E6',
  inactive: '#6B7280',
  background: '#FFFFFF',
  border: '#F3F4F6',
  text: '#1F2937',
};

// Custom Tab Bar Icon - Pill Style (like the reference design)
const TabIcon = ({ focused, icon, label, badge }) => {
  if (focused) {
    // Active state - Pill with icon + label
    return (
      <View style={styles.activePill}>
        <Feather name={icon} size={18} color={COLORS.primary} />
        <Text style={styles.activeLabel}>{label}</Text>
      </View>
    );
  }

  // Inactive state - Just icon
  return (
    <View style={styles.inactiveTab}>
      <View style={styles.iconWrapper}>
        <Feather name={icon} size={22} color={COLORS.inactive} />
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Auth Stack (Unauthenticated users)
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="TenantLead"
        component={TenantLeadScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

// Tenant Bottom Tab Navigator - Pill Style Design
const TenantTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={TenantDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="home" label="Home" />
          ),
        }}
      />
      <Tab.Screen
        name="Requests"
        component={MyRequestsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="file-text" label="Requests" />
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="message-square" label="Messages" badge={2} />
          ),
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="headphones" label="Support" />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="settings" label="Settings" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Stack (Authenticated users - includes tabs + modal screens)
const MainStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TenantTabs" component={TenantTabNavigator} />
      <Stack.Screen
        name="TenantLead"
        component={TenantLeadScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FE9200" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingHorizontal: 8,
  },
  // Active Pill Style
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Inactive Tab
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  iconWrapper: {
    position: 'relative',
  },
  // Badge
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});

export default AppNavigator;
