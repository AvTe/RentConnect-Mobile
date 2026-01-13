import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getWalletBalance, getReferralStats } from '../lib/database';

const HomeScreen = () => {
  const { userData, signOut, user, isAgent, isTenant, refreshUserData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralStats, setReferralStats] = useState(null);

  useEffect(() => {
    if (user && isAgent()) {
      fetchAgentData();
    }
  }, [user, userData]);

  const fetchAgentData = async () => {
    if (!user) return;

    try {
      const walletResult = await getWalletBalance(user.id);
      if (walletResult.success) {
        setWalletBalance(walletResult.balance);
      }

      const referralResult = await getReferralStats(user.id);
      if (referralResult.success) {
        setReferralStats(referralResult.stats);
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    if (isAgent()) {
      await fetchAgentData();
    }
    setRefreshing(false);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        },
      ]
    );
  };

  const getUserName = () => {
    if (userData?.name) return userData.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getUserRole = () => {
    if (isAgent()) return 'Agent';
    if (isTenant()) return 'Tenant';
    return 'User';
  };

  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FE9200']}
            tintColor="#FE9200"
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {getUserName().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{getUserName()}!</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{getUserRole()}</Text>
          </View>
        </View>

        {/* Agent-specific: Wallet Card */}
        {isAgent() && (
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <View style={styles.walletTitleRow}>
                <Feather name="credit-card" size={18} color="#FFFFFF" />
                <Text style={styles.walletTitle}>Wallet Balance</Text>
              </View>
              <TouchableOpacity style={styles.topUpButton}>
                <Feather name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.topUpText}>Top Up</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.walletBalance}>{formatCurrency(walletBalance)}</Text>
            <Text style={styles.walletSubtext}>Credits available to unlock leads</Text>
          </View>
        )}

        {/* Agent-specific: Stats Cards */}
        {isAgent() && referralStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{referralStats.total}</Text>
              <Text style={styles.statLabel}>Total Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{referralStats.creditsEarned}</Text>
              <Text style={styles.statLabel}>Credits Earned</Text>
            </View>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Feather name="user" size={18} color="#FE9200" />
            <Text style={styles.cardTitle}>Your Profile</Text>
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileValue}>{user?.email || 'N/A'}</Text>
          </View>

          {userData?.phone && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Phone</Text>
              <Text style={styles.profileValue}>{userData.phone}</Text>
            </View>
          )}

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Account Type</Text>
            <Text style={styles.profileValue}>{getUserRole()}</Text>
          </View>

          {isAgent() && userData?.referralCode && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Your Referral Code</Text>
              <Text style={[styles.profileValue, styles.referralCode]}>
                {userData.referralCode}
              </Text>
            </View>
          )}

          {isAgent() && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Verification Status</Text>
              <View style={[
                styles.statusBadge,
                userData?.verificationStatus === 'verified' && styles.statusVerified
              ]}>
                <Text style={styles.statusText}>
                  {userData?.verificationStatus || 'Pending'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Feather name="zap" size={18} color="#FE9200" />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>

          {isTenant() && (
            <>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#FFF5E6' }]}>
                  <Feather name="home" size={18} color="#FE9200" />
                </View>
                <Text style={styles.actionText}>Post Property Request</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="list" size={18} color="#0D9488" />
                </View>
                <Text style={styles.actionText}>My Requests</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </>
          )}

          {isAgent() && (
            <>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#FFF5E6' }]}>
                  <Feather name="search" size={18} color="#FE9200" />
                </View>
                <Text style={styles.actionText}>Browse Leads</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="unlock" size={18} color="#0D9488" />
                </View>
                <Text style={styles.actionText}>My Unlocked Leads</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="gift" size={18} color="#D97706" />
                </View>
                <Text style={styles.actionText}>Referral Program</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.comingSoon}>
            More features coming soon!
          </Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Feather name="log-out" size={18} color="#FE9200" style={{ marginRight: 8 }} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Yoombaa v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FE9200',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  roleBadge: {
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FE9200',
  },
  roleBadgeText: {
    color: '#FE9200',
    fontWeight: '600',
    fontSize: 12,
  },
  walletCard: {
    backgroundColor: '#FE9200',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  topUpText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  walletSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  profileLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  referralCode: {
    color: '#FE9200',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusVerified: {
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textTransform: 'capitalize',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  comingSoon: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF5E6',
    borderWidth: 2,
    borderColor: '#FE9200',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  signOutButtonText: {
    color: '#FE9200',
    fontSize: 16,
    fontWeight: 'bold'
  },
  versionText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 16,
  },
});

export default HomeScreen;