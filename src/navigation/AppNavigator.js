import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Auth Screens
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TenantLeadScreen from '../screens/TenantLeadScreen';
import SplashScreen from '../screens/SplashScreen';

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
  dark: '#1F2937',
};

// Custom Tab Bar Component with Center + Button
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  // Get tabs - filtering out the dummy "Add" screen
  const leftTabs = state.routes.slice(0, 2); // Home, Requests
  const rightTabs = state.routes.slice(3); // Support, Settings

  const renderTab = (route, index, actualIndex) => {
    const isFocused = state.index === actualIndex;

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
      <TouchableOpacity
        key={route.key}
        style={styles.tabItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {isFocused ? (
          <View style={styles.activePill}>
            <Feather name={iconName} size={18} color={COLORS.primary} />
            <Text style={styles.activeLabel}>{label}</Text>
          </View>
        ) : (
          <View style={styles.inactiveTab}>
            <Feather name={iconName} size={22} color={COLORS.inactive} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleAddPress = () => {
    navigation.navigate('TenantLead');
  };

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabBarContainer}>
        {/* Left Tabs */}
        <View style={styles.tabGroup}>
          {leftTabs.map((route, index) => renderTab(route, index, index))}
        </View>

        {/* Center Add Button */}
        <TouchableOpacity
          style={styles.addButtonWrapper}
          onPress={handleAddPress}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[COLORS.primary, '#E58300']}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Right Tabs */}
        <View style={styles.tabGroup}>
          {rightTabs.map((route, index) => renderTab(route, index, index + 3))}
        </View>
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

// Dummy component for the center tab (not actually rendered)
const DummyScreen = () => null;

// Tenant Tab Navigator - 4 tabs + center button
const TenantTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={TenantDashboardScreen} />
      <Tab.Screen name="Requests" component={MyRequestsScreen} />
      <Tab.Screen
        name="Add"
        component={DummyScreen}
        options={{ tabBarButton: () => null }}
      />
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
        options={{ animation: 'slide_from_bottom' }}
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
    return <SplashScreen />;
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
  // Tab Bar Styles
  tabBarWrapper: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 65,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  tabGroup: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
    paddingVertical: 8,
  },
  // Center Add Button
  addButtonWrapper: {
    marginTop: -30,
    borderRadius: 30,
    padding: 4,
    backgroundColor: COLORS.background,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;
