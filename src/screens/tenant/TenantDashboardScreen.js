import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ImageBackground,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
};

const STATUS_COLORS = {
    active: { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
    paused: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
    expired: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
    sold_out: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
};

const TenantDashboardScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ active: 0, views: 0, replies: 0 });
    const [recentRequests, setRecentRequests] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            // Fetch user's leads
            const { data: leads, error } = await supabase
                .from('leads')
                .select('*')
                .eq('tenant_email', user?.email)
                .order('created_at', { ascending: false })
                .limit(3);

            if (leads) {
                setRecentRequests(leads);
                const activeCount = leads.filter(l => l.status === 'active').length;
                const totalViews = leads.reduce((sum, l) => sum + (l.views || 0), 0);
                setStats({
                    active: activeCount,
                    views: totalViews,
                    replies: 0, // Will be implemented with agent replies
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getUserName = () => {
        if (userProfile?.full_name) return userProfile.full_name.split(' ')[0];
        if (user?.email) return user.email.split('@')[0];
        return 'there';
    };

    const formatBudget = (budget) => {
        if (!budget) return 'N/A';
        const num = parseInt(budget);
        if (num >= 1000) return `KSh ${(num / 1000).toFixed(0)}K`;
        return `KSh ${num}`;
    };

    const getStatusStyle = (status) => {
        return STATUS_COLORS[status] || STATUS_COLORS.expired;
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../../../assets/yoombaa logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.logoText}>yoombaa</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.notificationBtn}>
                        <Feather name="bell" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <View style={styles.avatar}>
                            <Feather name="user" size={20} color={COLORS.primary} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {/* Welcome Banner */}
                <View style={styles.bannerContainer}>
                    <ImageBackground
                        source={require('../../../assets/hero section img.jpg')}
                        style={styles.bannerBackground}
                        imageStyle={styles.bannerImage}
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']}
                            style={styles.bannerGradient}
                        >
                            <Text style={styles.bannerGreeting}>Jambo, {getUserName()}!</Text>
                            <Text style={styles.bannerText}>
                                Ready to find your next home? Post a{'\n'}request to let agents come to you.
                            </Text>
                            <TouchableOpacity
                                style={styles.postButton}
                                onPress={() => navigation.navigate('TenantLead')}
                                activeOpacity={0.9}
                            >
                                <Feather name="plus-circle" size={20} color="#FFFFFF" />
                                <Text style={styles.postButtonText}>Post New Request</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </ImageBackground>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.primaryLight }]}>
                            <Feather name="home" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statLabel}>ACTIVE</Text>
                        <Text style={styles.statValue}>{stats.active}</Text>
                        <Text style={styles.statSubtext}>
                            <Feather name="zap" size={12} color={COLORS.primary} /> JUST NOW
                        </Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#EDE9FE' }]}>
                            <Feather name="eye" size={18} color="#8B5CF6" />
                        </View>
                        <Text style={styles.statLabel}>VIEWS</Text>
                        <Text style={styles.statValue}>{stats.views}</Text>
                        <Text style={styles.statSubtext}>
                            <Feather name="plus" size={12} color="#8B5CF6" /> 12 THIS WEEK
                        </Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                            <Feather name="mail" size={18} color="#D97706" />
                        </View>
                        <Text style={styles.statLabel}>REPLIES</Text>
                        <Text style={styles.statValue}>{stats.replies}</Text>
                        <Text style={styles.statSubtext}>
                            <Feather name="clock" size={12} color="#D97706" /> 3 PENDING
                        </Text>
                    </View>
                </View>

                {/* My Requests Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Requests</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
                        <Text style={styles.viewAllText}>View All <Feather name="chevron-right" size={14} /></Text>
                    </TouchableOpacity>
                </View>

                {recentRequests.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Feather name="inbox" size={40} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>No requests yet</Text>
                        <Text style={styles.emptySubtext}>Post your first rental request!</Text>
                    </View>
                ) : (
                    recentRequests.map((request) => (
                        <TouchableOpacity
                            key={request.id}
                            style={styles.requestCard}
                            onPress={() => navigation.navigate('RequestDetail', { requestId: request.id })}
                            activeOpacity={0.8}
                        >
                            <View style={styles.requestHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(request.status).bg }]}>
                                    <Text style={[styles.statusText, { color: getStatusStyle(request.status).text }]}>
                                        {request.status?.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.requestDate}>
                                    Posted {new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </Text>
                                <View style={styles.budgetContainer}>
                                    <Text style={styles.budgetLabel}>BUDGET</Text>
                                    <Text style={styles.budgetValue}>KSh</Text>
                                    <Text style={styles.budgetAmount}>{parseInt(request.budget || 0).toLocaleString()}</Text>
                                    <Text style={styles.budgetPeriod}>/mo</Text>
                                </View>
                            </View>

                            <Text style={styles.requestTitle}>
                                {request.property_type} In {request.location}
                            </Text>

                            <View style={styles.locationRow}>
                                <Feather name="map-pin" size={14} color={COLORS.primary} />
                                <Text style={styles.locationText}>{request.location}</Text>
                            </View>

                            <View style={styles.requestFooter}>
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statItemLabel}>VIEWS</Text>
                                        <Text style={styles.statItemValue}>{request.views || 0}</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statItemLabel}>CONTACTS</Text>
                                        <Text style={styles.statItemValue}>{request.contacts || 0}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.manageButton}>
                                    <Text style={styles.manageText}>Manage</Text>
                                    <Feather name="chevron-right" size={16} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 32,
        height: 32,
    },
    logoText: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notificationBtn: {
        padding: 8,
    },
    avatarContainer: {
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 20,
        padding: 2,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    bannerContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    bannerBackground: {
        width: '100%',
        height: 200,
    },
    bannerImage: {
        borderRadius: 20,
    },
    bannerGradient: {
        flex: 1,
        padding: 20,
        justifyContent: 'flex-end',
    },
    bannerGreeting: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    bannerText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 20,
        marginBottom: 16,
    },
    postButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        alignSelf: 'flex-start',
    },
    postButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    statSubtext: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    viewAllText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    requestCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    requestDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 10,
        flex: 1,
    },
    budgetContainer: {
        alignItems: 'flex-end',
    },
    budgetLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    budgetValue: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
    budgetAmount: {
        fontSize: 18,
        color: COLORS.primary,
        fontWeight: '700',
    },
    budgetPeriod: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    requestTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    locationText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 24,
    },
    statItem: {
        alignItems: 'flex-start',
    },
    statItemLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    statItemValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    manageText: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
});

export default TenantDashboardScreen;
