import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
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

// Tenant Bottom Tab Navigator
const TenantTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard':
              iconName = 'grid';
              break;
            case 'Requests':
              iconName = 'file-text';
              break;
            case 'Messages':
              iconName = 'message-square';
              break;
            case 'Support':
              iconName = 'headphones';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'circle';
          }
          return <Feather name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={TenantDashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Requests"
        component={MyRequestsScreen}
        options={{ tabBarLabel: 'My Requests' }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarBadge: 2,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.primary,
            color: '#FFFFFF',
            fontSize: 10,
            minWidth: 18,
            height: 18,
          },
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{ tabBarLabel: 'Support' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
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
});

export default AppNavigator;
