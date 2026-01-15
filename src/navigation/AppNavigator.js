import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Text, Platform } from 'react-native';
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
  inactive: '#9CA3AF',
  background: '#FFFFFF',
  border: '#E5E7EB',
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIcon: ({ focused }) => {
          let iconName;
          let label;

          switch (route.name) {
            case 'Dashboard':
              iconName = 'home';
              label = 'Home';
              break;
            case 'Requests':
              iconName = 'file-text';
              label = 'Requests';
              break;
            case 'Messages':
              iconName = 'message-square';
              label = 'Messages';
              break;
            case 'Support':
              iconName = 'headphones';
              label = 'Support';
              break;
            case 'Settings':
              iconName = 'settings';
              label = 'Settings';
              break;
            default:
              iconName = 'circle';
              label = '';
          }

          const showBadge = route.name === 'Messages';

          if (focused) {
            // Active - Pill Style
            return (
              <View style={styles.activePill}>
                <Feather name={iconName} size={18} color={COLORS.primary} />
                <Text style={styles.activeLabel}>{label}</Text>
              </View>
            );
          }

          // Inactive - Just Icon
          return (
            <View style={styles.inactiveIcon}>
              <Feather name={iconName} size={22} color={COLORS.inactive} />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
              )}
            </View>
          );
        },
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={TenantDashboardScreen} />
      <Tab.Screen name="Requests" component={MyRequestsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Support" component={SupportScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Main Stack (Authenticated users)
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
    height: Platform.OS === 'ios' ? 90 : 65,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
    paddingHorizontal: 10,
  },
  tabBarItem: {
    paddingVertical: 0,
    marginVertical: 0,
  },
  // Active Pill
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    minWidth: 80,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Inactive Icon
  inactiveIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 8,
  },
  // Badge
  badge: {
    position: 'absolute',
    top: 2,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});

export default AppNavigator;
