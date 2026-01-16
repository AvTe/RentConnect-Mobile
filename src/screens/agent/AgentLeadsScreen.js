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
    const [filteredCount, setFilteredCount] = useState(0);

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
            setFilteredCount(data?.length || 0);
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

    const handleUnlock = async (lead) => {
        toast.info(`Unlock feature coming soon for ${lead.tenant_name}`);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatBudget = (budget) => {
        if (!budget) return 'Budget TBD';
        if (budget >= 1000) {
            return `KSh ${Math.round(budget / 1000)}K`;
        }
        return `KSh ${budget.toLocaleString()}`;
    };

    const getSlotStatus = (lead) => {
        const unlocked = lead.unlocked_count || 0;
        const maxSlots = 3;
        const available = maxSlots - unlocked;

        if (available === 0) return { text: 'FULL', color: COLORS.error };
        if (available === maxSlots) return { text: 'AVAILABLE', color: COLORS.success };
        return { text: 'OPEN', color: COLORS.warning };
    };

    const isExpired = (lead) => {
        if (!lead.move_in_date) return false;
        return new Date(lead.move_in_date) < new Date();
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
        const expired = isExpired(lead);
        const slotStatus = getSlotStatus(lead);
        const unlocked = lead.unlocked_count || 0;
        const views = lead.views || 0;

        return (
            <View style={[styles.leadCard, expired && styles.expiredCard]}>
                {/* Top Row - Stats & Budget */}
                <View style={styles.leadTopRow}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Feather name="users" size={14} color={expired ? COLORS.expired : COLORS.textSecondary} />
                            <Text style={[styles.statText, expired && styles.expiredText]}>{unlocked}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Feather name="eye" size={14} color={expired ? COLORS.expired : COLORS.textSecondary} />
                            <Text style={[styles.statText, expired && styles.expiredText]}>{views}</Text>
                        </View>
                    </View>
                    <View style={[styles.budgetBadge, expired && styles.expiredBudgetBadge]}>
                        <Feather name="dollar-sign" size={12} color={expired ? COLORS.expired : COLORS.primary} />
                        <Text style={[styles.budgetText, expired && styles.expiredText]}>
                            {formatBudget(lead.budget)}
                        </Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={[styles.leadTitle, expired && styles.expiredText]}>
                    Looking for {lead.property_type || 'Property'}
                </Text>

                {/* Tags Row */}
                <View style={styles.tagsRow}>
                    <View style={[styles.tag, expired && styles.expiredTag]}>
                        <Feather name="map-pin" size={12} color={expired ? COLORS.expired : COLORS.textSecondary} />
                        <Text style={[styles.tagText, expired && styles.expiredText]}>{lead.location || 'TBD'}</Text>
                    </View>
                    <View style={[styles.tag, expired && styles.expiredTag]}>
                        <Feather name="home" size={12} color={expired ? COLORS.expired : COLORS.textSecondary} />
                        <Text style={[styles.tagText, expired && styles.expiredText]}>{lead.property_type || 'Any'}</Text>
                    </View>
                    <View style={[styles.tag, expired && styles.expiredTag]}>
                        <Feather name="calendar" size={12} color={expired ? COLORS.expired : COLORS.textSecondary} />
                        <Text style={[styles.tagText, expired && styles.expiredText]}>
                            {formatDate(lead.move_in_date || lead.created_at)}
                        </Text>
                    </View>
                </View>

                {/* Slots */}
                <View style={styles.slotsRow}>
                    <Text style={[styles.slotsLabel, expired && styles.expiredText]}>SLOTS</Text>
                    <View style={styles.slotsBoxes}>
                        {[1, 2, 3].map((slot) => (
                            <View
                                key={slot}
                                style={[
                                    styles.slotBox,
                                    slot <= unlocked && styles.slotBoxFilled,
                                    expired && styles.expiredSlotBox,
                                ]}
                            >
                                <Text style={[
                                    styles.slotNumber,
                                    slot <= unlocked && styles.slotNumberFilled,
                                    expired && styles.expiredText,
                                ]}>
                                    {slot}
                                </Text>
                            </View>
                        ))}
                    </View>
                    <Text style={[styles.slotsCount, expired && styles.expiredText]}>
                        {unlocked}/3
                    </Text>
                    <Text style={[styles.slotsStatus, { color: expired ? COLORS.expired : slotStatus.color }]}>
                        {expired ? 'EXPIRED' : slotStatus.text}
                    </Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Tenant Info */}
                <View style={styles.tenantRow}>
                    <View style={[styles.avatar, expired && styles.expiredAvatar]}>
                        <Text style={[styles.avatarText, expired && styles.expiredText]}>
                            {lead.tenant_name?.charAt(0).toUpperCase() || 'T'}
                        </Text>
                    </View>
                    <View style={styles.tenantInfo}>
                        <Text style={[styles.tenantName, expired && styles.expiredText]}>
                            {lead.tenant_name || 'Tenant'}
                        </Text>
                        <Text style={[styles.tenantStatus, expired && styles.expiredText]}>
                            {lead.phone_verified ? 'Verified Renter' : 'Renter'}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                {expired ? (
                    <TouchableOpacity style={styles.expiredButton} disabled>
                        <Feather name="clock" size={16} color={COLORS.expired} />
                        <Text style={styles.expiredButtonText}>Expired</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.unlockButton}
                            onPress={() => handleUnlock(lead)}
                            activeOpacity={0.9}
                        >
                            <Feather name="zap" size={18} color="#FFFFFF" />
                            <Text style={styles.unlockButtonText}>Unlock · 1000 Credits</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.exclusiveButton} activeOpacity={0.8}>
                            <Feather name="award" size={16} color={COLORS.primary} />
                            <Text style={styles.exclusiveButtonText}>Buy Exclusive Access</Text>
                        </TouchableOpacity>
                    </>
                )}
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
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoR}>R</Text>
                    </View>
                    <Text style={styles.logoText}>Yoombaa</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Feather name="grid" size={22} color={COLORS.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Feather name="bell" size={22} color={COLORS.text} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addButton}>
                        <Feather name="plus" size={18} color="#FFFFFF" />
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoR: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
    },
    logoText: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginLeft: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.error,
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    // Lead Card Styles - No shadow, only border
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
    leadTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    budgetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    expiredBudgetBadge: {
        backgroundColor: '#F3F4F6',
    },
    budgetText: {
        fontSize: 13,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    leadTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 12,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    expiredTag: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    tagText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    slotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    slotsLabel: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginRight: 10,
    },
    slotsBoxes: {
        flexDirection: 'row',
        gap: 4,
    },
    slotBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    slotBoxFilled: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    expiredSlotBox: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    slotNumber: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
    },
    slotNumberFilled: {
        color: '#FFFFFF',
    },
    slotsCount: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginLeft: 10,
        marginRight: 8,
    },
    slotsStatus: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 14,
    },
    tenantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    expiredAvatar: {
        backgroundColor: '#F3F4F6',
    },
    avatarText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    tenantInfo: {
        marginLeft: 12,
    },
    tenantName: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    tenantStatus: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        marginBottom: 10,
    },
    unlockButtonText: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    exclusiveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.card,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    exclusiveButtonText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    expiredButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    expiredButtonText: {
        fontSize: 15,
        fontFamily: FONTS.medium,
        color: COLORS.expired,
    },
    expiredText: {
        color: COLORS.expired,
    },
});

export default AgentLeadsScreen;
