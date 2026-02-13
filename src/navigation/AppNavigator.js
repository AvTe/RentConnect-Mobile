import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
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

// Agent Screens
import AgentLeadsScreen from '../screens/agent/AgentLeadsScreen';
import AgentWalletScreen from '../screens/agent/AgentWalletScreen';
import AgentPropertiesScreen from '../screens/agent/AgentPropertiesScreen';
import AgentAccountScreen from '../screens/agent/AgentAccountScreen';
import AgentSettingsScreen from '../screens/agent/AgentSettingsScreen';
import AgentRewardsScreen from '../screens/agent/AgentRewardsScreen';
import AgentAssetsScreen from '../screens/agent/AgentAssetsScreen';
import LeadDetailScreen from '../screens/agent/LeadDetailScreen';
import BuyCreditsScreen from '../screens/agent/BuyCreditsScreen';
import NotificationsScreen from '../screens/agent/NotificationsScreen';
import AgentProfileEditScreen from '../screens/agent/AgentProfileEditScreen';
import LeadFiltersScreen from '../screens/agent/LeadFiltersScreen';

// Profile & Settings Screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import LanguageScreen from '../screens/settings/LanguageScreen';

// Support Screens
import SupportScreen from '../screens/support/SupportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Agent Tab Bar Component - Clean Bottom Navigation
const AgentTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const renderTab = (route, index) => {
    const isFocused = state.index === index;

    let iconName;
    let label;

    switch (route.name) {
      case 'AgentLeads':
        iconName = 'grid';
        label = 'Dash';
        break;
      case 'AgentProperties':
        iconName = 'home';
        label = 'Properties';
        break;
      case 'AgentAssets':
        iconName = 'folder';
        label = 'Assets';
        break;
      case 'AgentRewards':
        iconName = 'gift';
        label = 'Rewards';
        break;
      case 'AgentAccount':
        iconName = 'user';
        label = 'Account';
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
        style={styles.agentTabItem}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityLabel={`${label} tab`}
        accessibilityState={{ selected: isFocused }}
      >
        <View style={[
          styles.agentTabIcon,
          isFocused && { backgroundColor: colors.primaryLight }
        ]}>
          <Feather
            name={iconName}
            size={20}
            color={isFocused ? colors.primary : colors.textSecondary}
          />
        </View>
        <Text style={[
          styles.agentTabLabel,
          { color: isFocused ? colors.primary : colors.textSecondary }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.agentTabBarWrapper, { paddingBottom: insets.bottom, backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={styles.agentTabBarContainer}>
        {state.routes.map((route, index) => renderTab(route, index))}
      </View>
    </View>
  );
};

// Tenant Custom Tab Bar Component with Center + Button
const TenantTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const leftTabs = state.routes.slice(0, 2);
  const rightTabs = state.routes.slice(3);

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
        accessibilityRole="tab"
        accessibilityLabel={`${label} tab`}
        accessibilityState={{ selected: isFocused }}
      >
        {isFocused ? (
          <View style={[styles.activePill, { backgroundColor: colors.primaryLight }]}>
            <Feather name={iconName} size={18} color={colors.primary} />
            <Text style={[styles.activeLabel, { color: colors.primary }]}>{label}</Text>
          </View>
        ) : (
          <View style={styles.inactiveTab}>
            <Feather name={iconName} size={22} color={colors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleAddPress = () => {
    navigation.navigate('TenantLead');
  };

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom, backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={styles.tabBarContainer}>
        <View style={styles.tabGroup}>
          {leftTabs.map((route, index) => renderTab(route, index, index))}
        </View>

        <TouchableOpacity
          style={[styles.addButtonWrapper, { backgroundColor: colors.card }]}
          onPress={handleAddPress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Post new rental request"
        >
          <LinearGradient
            colors={[colors.primary, '#E58300']}
            style={styles.addButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="plus" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

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

// Dummy component for the center tab
const DummyScreen = () => null;

// Tenant Tab Navigator
const TenantTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TenantTabBar {...props} />}
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

// Agent Tab Navigator
const AgentTabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <AgentTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="AgentLeads" component={AgentLeadsScreen} />
      <Tab.Screen name="AgentProperties" component={AgentPropertiesScreen} />
      <Tab.Screen name="AgentAssets" component={AgentAssetsScreen} />
      <Tab.Screen name="AgentRewards" component={AgentRewardsScreen} />
      <Tab.Screen name="AgentAccount" component={AgentAccountScreen} />
    </Tab.Navigator>
  );
};

// Main Stack for Tenants
const TenantMainStack = () => {
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
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="LanguageSettings"
        component={LanguageScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

// Main Stack for Agents
const AgentMainStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AgentTabs" component={AgentTabNavigator} />
      <Stack.Screen
        name="AgentSettings"
        component={AgentSettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentRewards"
        component={AgentRewardsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentWallet"
        component={AgentWalletScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentAssets"
        component={AgentAssetsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="LeadDetail"
        component={LeadDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BuyCredits"
        component={BuyCreditsScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentProfileEdit"
        component={AgentProfileEditScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="LeadFilters"
        component={LeadFiltersScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="LanguageSettings"
        component={LanguageScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading, isAgent, isTenant } = useAuth();
  const { isDark, colors } = useTheme();

  if (loading) {
    return <SplashScreen />;
  }

  // Determine which stack to show
  const renderMainStack = () => {
    if (!user) return <AuthStack />;

    // Check user type
    if (isAgent && isAgent()) {
      return <AgentMainStack />;
    }

    // Default to tenant stack
    return <TenantMainStack />;
  };

  // Custom navigation theme based on app theme
  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
    fonts: {
      regular: {
        fontFamily: 'DMSans_400Regular',
        fontWeight: 'normal',
      },
      medium: {
        fontFamily: 'DMSans_500Medium',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'DMSans_700Bold',
        fontWeight: 'bold',
      },
      heavy: {
        fontFamily: 'DMSans_700Bold',
        fontWeight: '900',
      },
    },
  };

  return (
    <NavigationContainer theme={navigationTheme}>
      {renderMainStack()}
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
  // Tenant Tab Bar Styles
  tabBarWrapper: {
    borderTopWidth: 1,
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
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  activeLabel: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  addButtonWrapper: {
    marginTop: -30,
    borderRadius: 30,
    padding: 4,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Agent Tab Bar Styles - Clean Bottom Navigation
  agentTabBarWrapper: {
    borderTopWidth: 1,
  },
  agentTabBarContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  agentTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  agentTabIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentTabLabel: {
    fontSize: 10,
    fontFamily: 'DMSans_500Medium',
    marginTop: 2,
  },
});

export default AppNavigator;

