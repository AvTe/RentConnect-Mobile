import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          let iconName;
          let label;
          let showBadge = false;

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
              showBadge = true;
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

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <View key={route.key} style={styles.tabItem}>
              {isFocused ? (
                <View style={styles.activePill} onTouchEnd={onPress}>
                  <Feather name={iconName} size={18} color={COLORS.primary} />
                  <Text style={styles.activeLabel}>{label}</Text>
                </View>
              ) : (
                <View style={styles.inactiveTab} onTouchEnd={onPress}>
                  <Feather name={iconName} size={22} color={COLORS.inactive} />
                  {showBadge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>2</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Auth Stack
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
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

// Tenant Tab Navigator
const TenantTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={TenantDashboardScreen} />
      <Tab.Screen name="Requests" component={MyRequestsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Support" component={SupportScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Main Stack
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
  // Tab Bar Container
  tabBarContainer: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tabBarContent: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Active Pill
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
  },
  activeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Inactive Tab
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  // Badge
  badge: {
    position: 'absolute',
    top: 4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default AppNavigator;
