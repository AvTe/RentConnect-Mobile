import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';

// Auth Screens
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
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
import LeadSearchScreen from '../screens/agent/LeadSearchScreen';

// Profile & Settings Screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import LanguageScreen from '../screens/settings/LanguageScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import PrivacyPolicyScreen from '../screens/settings/PrivacyPolicyScreen';

// Support Screens
import SupportScreen from '../screens/support/SupportScreen';
import TicketListScreen from '../screens/support/TicketListScreen';
import TicketDetailScreen from '../screens/support/TicketDetailScreen';
import CreateTicketScreen from '../screens/support/CreateTicketScreen';

// New Feature Screens
import AgentRatingsScreen from '../screens/agent/AgentRatingsScreen';
import SubmitRatingScreen from '../screens/agent/SubmitRatingScreen';
import PropertyListScreen from '../screens/agent/PropertyListScreen';
import CreatePropertyScreen from '../screens/agent/CreatePropertyScreen';
import SubscriptionScreen from '../screens/agent/SubscriptionScreen';
import VouchersScreen from '../screens/agent/VouchersScreen';
import BadLeadReportScreen from '../screens/agent/BadLeadReportScreen';
import AgentBrowseScreen from '../screens/tenant/AgentBrowseScreen';
import AgentProfileViewScreen from '../screens/tenant/AgentProfileViewScreen';
import SavedPropertiesScreen from '../screens/tenant/SavedPropertiesScreen';

import { getUnreadNotificationCount, subscribeToNotifications } from '../lib/notificationService';
import { useAuth as useAuthForBadge } from '../context/AuthContext';
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Agent Tab Bar Component - Clean Bottom Navigation
const AgentTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuthForBadge();
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!user?.id) return;
    let unsub;
    const load = async () => {
      const result = await getUnreadNotificationCount(user.id);
      if (result.success) setUnreadCount(result.count || 0);
      unsub = subscribeToNotifications(user.id, () => {
        getUnreadNotificationCount(user.id).then(r => {
          if (r.success) setUnreadCount(r.count || 0);
        });
      });
    };
    load();
    return () => { if (unsub) unsub(); };
  }, [user?.id]);

  const renderTab = (route, index) => {
    const isFocused = state.index === index;

    let iconName;
    let label;
    let showBadge = false;

    switch (route.name) {
      case 'AgentLeads':
        iconName = 'grid';
        label = 'Dash';
        showBadge = unreadCount > 0;
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
          {showBadge && (
            <View style={styles.badgeDot}>
              {unreadCount > 0 && unreadCount <= 99 ? (
                <Text style={styles.badgeText}>{unreadCount}</Text>
              ) : unreadCount > 99 ? (
                <Text style={styles.badgeText}>99+</Text>
              ) : null}
            </View>
          )}
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
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
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
      <Stack.Screen
        name="AgentBrowse"
        component={AgentBrowseScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentProfileView"
        component={AgentProfileViewScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentRatings"
        component={AgentRatingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SubmitRating"
        component={SubmitRatingScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="TicketList"
        component={TicketListScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreateTicket"
        component={CreateTicketScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="SavedProperties"
        component={SavedPropertiesScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
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
        name="LeadSearch"
        component={LeadSearchScreen}
        options={{
          animation: 'fade',
          animationDuration: 200,
          presentation: 'transparentModal',
          headerShown: false,
        }}
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
      <Stack.Screen
        name="TicketList"
        component={TicketListScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="TicketDetail"
        component={TicketDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreateTicket"
        component={CreateTicketScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="SavedProperties"
        component={SavedPropertiesScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentRatings"
        component={AgentRatingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PropertyList"
        component={PropertyListScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CreateProperty"
        component={CreatePropertyScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Vouchers"
        component={VouchersScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="BadLeadReport"
        component={BadLeadReportScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="SubmitRating"
        component={SubmitRatingScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="AgentProfileView"
        component={AgentProfileViewScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AgentBrowse"
        component={AgentBrowseScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};

// Deep linking configuration
const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'yoombaa://', 'https://yoombaa.com', 'https://www.yoombaa.com'],
  config: {
    screens: {
      // Auth screens
      Landing: 'landing',
      Login: 'login',
      ResetPassword: 'reset-password',
      // Agent stack screens
      AgentTabs: {
        screens: {
          AgentLeads: 'agent/leads',
        },
      },
      LeadDetail: {
        path: 'lead/:leadId',
        parse: {
          leadId: (leadId) => leadId,
        },
      },
      // Tenant stack screens
      TenantTabs: {
        screens: {
          Dashboard: 'tenant/dashboard',
        },
      },
    },
  },
};

const AppNavigator = () => {
  const { user, loading, isAgent, isTenant, passwordRecoveryMode, handleAuthDeepLink, clearPasswordRecoveryMode } = useAuth();
  const { isDark, colors } = useTheme();
  const navigationRef = useNavigationContainerRef();

  // Handle incoming deep links for password recovery tokens
  React.useEffect(() => {
    // Check the initial URL when app opens from a deep link
    const handleInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleAuthDeepLink(initialUrl);
      }
    };
    handleInitialUrl();

    // Listen for deep links while the app is open
    const subscription = Linking.addEventListener('url', async (event) => {
      if (event.url) {
        await handleAuthDeepLink(event.url);
      }
    });

    return () => subscription?.remove();
  }, []);

  // Navigate to ResetPassword screen when recovery mode is activated
  React.useEffect(() => {
    if (passwordRecoveryMode && navigationRef.isReady()) {
      // Small delay to ensure navigation is fully ready after stack render
      setTimeout(() => {
        try {
          navigationRef.navigate('ResetPassword');
        } catch (e) {
          console.warn('Could not navigate to ResetPassword:', e);
        }
      }, 300);
    }
  }, [passwordRecoveryMode]);

  if (loading) {
    return <SplashScreen />;
  }

  // Determine which stack to show
  const renderMainStack = () => {
    // CRITICAL: During password recovery, keep the AuthStack active
    // so ResetPassword screen stays mounted. Without this, setting
    // the recovery session would switch to Agent/Tenant stack and
    // unmount the ResetPassword screen.
    if (passwordRecoveryMode) return <AuthStack />;
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
    <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
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
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFFFFF',
  },
});

export default AppNavigator;

