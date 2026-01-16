import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import { FONTS } from '../../constants/theme';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    expired: '#9CA3AF',
};

const AgentLeadsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leads, setLeads] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [totalLeads, setTotalLeads] = useState(0);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning,';
        if (hour < 17) return 'Good Afternoon,';
        return 'Good Evening,';
    };

    const getUserName = () => {
        if (userData?.name) return userData.name.split(' ')[0];
        if (user?.email) return user.email.split('@')[0];
        return 'Agent';
    };

    const getUserInitials = () => {
        const name = getUserName();
        return name.charAt(0).toUpperCase();
    };

    const fetchLeads = useCallback(async () => {
        try {
            const { data, error, count } = await supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setLeads(data || []);
            setTotalLeads(count || 0);
        } catch (error) {
            console.error('Error fetching leads:', error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchLeads();
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const formatBudget = (budget) => {
        if (!budget) return '0';
        return budget.toLocaleString();
    };

    const getLeadStatus = (lead) => {
        if (!lead.move_in_date) return { text: 'ACTIVE', color: COLORS.success, bg: COLORS.successLight };
        const isExpired = new Date(lead.move_in_date) < new Date();
        if (isExpired) return { text: 'EXPIRED', color: COLORS.expired, bg: '#F3F4F6' };
        return { text: 'ACTIVE', color: COLORS.success, bg: COLORS.successLight };
    };

    const filteredLeads = leads.filter(lead => {
        const query = searchQuery.toLowerCase();
        return (
            lead.location?.toLowerCase().includes(query) ||
            lead.property_type?.toLowerCase().includes(query) ||
            lead.tenant_name?.toLowerCase().includes(query)
        );
    });

    const LeadCard = ({ lead }) => {
        const status = getLeadStatus(lead);
        const isExpired = status.text === 'EXPIRED';
        const views = lead.views || 0;
        const contacts = lead.unlocked_count || 0;

        return (
            <View style={[styles.leadCard, isExpired && styles.expiredCard]}>
                {/* Top Row - Status & Posted Date */}
                <View style={styles.cardTopRow}>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                    </View>
                    <View style={styles.postedRow}>
                        <Feather name="calendar" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.postedText}>Posted {formatDate(lead.created_at)}</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={[styles.leadTitle, isExpired && styles.expiredText]}>
                    {lead.property_type || 'Property'} In {lead.location || 'Location'}
                </Text>

                {/* Location Row */}
                <View style={styles.locationRow}>
                    <Feather name="map-pin" size={14} color={COLORS.textSecondary} />
                    <Text style={[styles.locationText, isExpired && styles.expiredText]}>
                        {lead.location || 'Location TBD'}
                    </Text>
                </View>

                {/* Budget Section */}
                <View style={styles.budgetSection}>
                    <Text style={styles.budgetLabel}>BUDGET</Text>
                    <View style={styles.budgetRow}>
                        <Text style={styles.budgetCurrency}>KSh</Text>
                        <Text style={[styles.budgetAmount, isExpired && styles.expiredText]}>
                            {formatBudget(lead.budget)}
                        </Text>
                        <Text style={styles.budgetPeriod}>/mo</Text>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Bottom Row - Stats & Manage */}
                <View style={styles.cardBottomRow}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Feather name="eye" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.statLabel}>VIEWS</Text>
                            <Text style={styles.statValue}>{views}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Feather name="users" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.statLabel}>CONTACTS</Text>
                            <Text style={styles.statValue}>{contacts}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.manageButton}
                        onPress={() => toast.info('Lead details coming soon')}
                    >
                        <Text style={styles.manageText}>Manage</Text>
                        <Feather name="chevron-right" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
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
            {/* Header - Matching the mockup */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Feather name="home" size={24} color={COLORS.primary} />
                    <Text style={styles.logoText}>yoombaa</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIconBtn}>
                        <Feather name="bell" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.avatarButton}>
                        <Feather name="user" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Greeting Section */}
            <LinearGradient
                colors={['#FFF5E6', '#FFFFFF']}
                style={styles.greetingSection}
            >
                <Text style={styles.greetingText}>{getGreeting()}</Text>
                <Text style={styles.greetingName}>{getUserName()}!</Text>
            </LinearGradient>

            {/* Leads Dashboard Header */}
            <View style={styles.dashboardHeader}>
                <View>
                    <Text style={styles.dashboardTitle}>Leads Dashboard</Text>
                    <Text style={styles.dashboardSubtitle}>
                        {filteredLeads.length} leads available{' '}
                        <Text style={styles.filterHighlight}>(filtered from {totalLeads})</Text>
                    </Text>
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Feather name="sliders" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Feather name="search" size={18} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search leads..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Leads List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
            >
                {filteredLeads.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="inbox" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No leads found</Text>
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'Try adjusting your search' : 'New leads will appear here'}
                        </Text>
                    </View>
                ) : (
                    filteredLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} />
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
    // Header - Matching mockup exactly
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
        marginLeft: 6,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    // Greeting
    greetingSection: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: 'center',
    },
    greetingText: {
        fontSize: 24,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    greetingName: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    // Dashboard Header
    dashboardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: COLORS.card,
    },
    dashboardTitle: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    dashboardSubtitle: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    filterHighlight: {
        color: COLORS.primary,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        marginHorizontal: 20,
        marginVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        fontFamily: FONTS.regular,
        color: COLORS.text,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    // Lead Card - Matching the mockup
    leadCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    expiredCard: {
        backgroundColor: '#FAFAFA',
        opacity: 0.85,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        letterSpacing: 0.5,
    },
    postedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    postedText: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    leadTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    locationText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    budgetSection: {
        marginBottom: 16,
    },
    budgetLabel: {
        fontSize: 11,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    budgetRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    budgetCurrency: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginRight: 4,
    },
    budgetAmount: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    budgetPeriod: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginLeft: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 12,
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    manageText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    expiredText: {
        color: COLORS.expired,
    },
});

export default AgentLeadsScreen;
