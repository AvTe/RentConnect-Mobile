import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const HomeScreen = () => {
  const { userData, signOut, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome, {userData?.name || user?.email?.split('@')[0] || 'User'}!
          </Text>
          <Text style={styles.subtitle}>
            {userData?.user_type === 'agent' ? 'Agent Dashboard' : 'Tenant Dashboard'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Profile</Text>
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Email:</Text>
            <Text style={styles.profileValue}>{user?.email}</Text>
          </View>
          {userData?.phone && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Phone:</Text>
              <Text style={styles.profileValue}>{userData.phone}</Text>
            </View>
          )}
          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Account Type:</Text>
            <Text style={styles.profileValue}>
              {userData?.user_type?.charAt(0).toUpperCase() + userData?.user_type?.slice(1) || 'User'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.comingSoon}>
            More features coming soon!{'\n'}
            Browse properties, manage listings, and more.
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    marginTop: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  comingSoon: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  signOutButton: {
    backgroundColor: '#FFF5E6',
    borderWidth: 2,
    borderColor: '#FE9200',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#FE9200',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
