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
    Alert,
    Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FONTS } from '../../constants/theme';
import {
    fetchLeads,
    getUnlockedLeadIds,
    getLeadState,
    calculateUnlockCost,
    calculateExclusiveCost,
    getRemainingTime,
    unlockLead,
    LEAD_STATE_STYLES,
} from '../../lib/leadService';
import { getWalletBalance } from '../../lib/database';

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
    const [unlockedLeadIds, setUnlockedLeadIds] = useState(new Set());
    const [creditBalance, setCreditBalance] = useState(0);
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

    const loadData = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Fetch leads
            const leadsResult = await fetchLeads();
            if (leadsResult.success) {
                setLeads(leadsResult.leads);
                setTotalLeads(leadsResult.count);
            }

            // Fetch unlocked lead IDs
            const unlockedResult = await getUnlockedLeadIds(user.id);
            if (unlockedResult.success) {
                setUnlockedLeadIds(new Set(unlockedResult.leadIds));
            }

            // Fetch credit balance
            const balanceResult = await getWalletBalance(user.id);
            if (balanceResult.success) {
                setCreditBalance(balanceResult.balance);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleUnlock = async (lead, isExclusive = false) => {
        const cost = isExclusive ? calculateExclusiveCost(lead) : calculateUnlockCost(lead);

        if (creditBalance < cost) {
            Alert.alert(
                'Insufficient Credits',
                `You need ${cost} credits but only have ${creditBalance}. Would you like to top up?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Top Up', onPress: () => navigation.navigate('AgentWallet') }
                ]
            );
            return;
        }

        Alert.alert(
            isExclusive ? 'Buy Exclusive Access' : 'Unlock Lead',
            `This will cost ${cost} credits. Continue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        const result = await unlockLead(user.id, lead.id, isExclusive);
                        if (result.success) {
                            toast.success('Lead unlocked successfully!');
                            // Update local state
                            setUnlockedLeadIds(prev => new Set([...prev, lead.id]));
                            setCreditBalance(prev => prev - cost);
                            // Refresh leads to get updated slot count
                            loadData();
                        } else {
                            toast.error(result.error || 'Failed to unlock lead');
                        }
                    }
                }
            ]
        );
    };

    const handleCall = (lead) => {
        if (lead.tenant_phone) {
            Linking.openURL(`tel:${lead.tenant_phone}`);
        } else {
            toast.info('Phone number not available');
        }
    };

    const handleWhatsApp = (lead) => {
        const phone = lead.tenant_phone || lead.phone;
        if (phone) {
            Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
        } else {
            toast.info('Phone number not available');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'TBD';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatBudget = (budget) => {
        if (!budget) return 'TBD';
        if (budget >= 1000) {
            return `KSh ${Math.round(budget / 1000)}K`;
        }
        return `KSh ${budget.toLocaleString()}`;
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
        const isUnlocked = unlockedLeadIds.has(lead.id);
        const state = getLeadState(lead, isUnlocked);
        const stateStyles = LEAD_STATE_STYLES[state];
        const maxSlots = lead.max_slots || 3;
        const claimedSlots = lead.claimed_slots || 0;
        const views = lead.views || 0;
        const contacts = lead.contacts || claimedSlots;
        const unlockCost = calculateUnlockCost(lead);
        const exclusiveCost = calculateExclusiveCost(lead);
        const isExpired = state === 'expired';
        const isSoldOut = state === 'sold_out';
        const canBuyExclusive = claimedSlots === 0 && !lead.is_exclusive && !isExpired && !isSoldOut;

        const tenantName = lead.tenant_info?.name || lead.tenant_name || 'Tenant';
        const propertyType = lead.property_type || lead.requirements?.property_type || 'Property';
        const location = lead.location || lead.requirements?.location || 'Location';
        const budget = lead.budget || lead.requirements?.budget || 0;

        return (
            <View style={[styles.leadCard, (isExpired || isSoldOut) && styles.disabledCard]}>
                {/* Top Row - Stats & Budget */}
                <View style={styles.topRow}>
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Feather name="users" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.statText}>{contacts}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Feather name="eye" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.statText}>{views}</Text>
                        </View>
                    </View>
                    <View style={[styles.budgetBadge, budget >= 50000 && styles.budgetBadgeHigh]}>
                        <Text style={[styles.budgetText, budget >= 50000 && styles.budgetTextHigh]}>
                            {formatBudget(budget)}
                        </Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={[styles.leadTitle, (isExpired || isSoldOut) && styles.disabledText]}>
                    Looking for {propertyType}
                </Text>

                {/* Tags Row */}
                <View style={styles.tagsRow}>
                    <View style={styles.tag}>
                        <Feather name="map-pin" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.tagText}>{location}</Text>
                    </View>
                    <View style={styles.tag}>
                        <Feather name="home" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.tagText}>{propertyType}</Text>
                    </View>
                    <View style={styles.tag}>
                        <Feather name="calendar" size={12} color={COLORS.textSecondary} />
                        <Text style={styles.tagText}>
                            {formatDate(lead.move_in_date || lead.created_at)}
                        </Text>
                    </View>
                </View>

                {/* Slots Row */}
                <View style={styles.slotsContainer}>
                    <View style={styles.slotsLeft}>
                        <Text style={styles.slotsLabel}>SLOTS</Text>
                        <View style={styles.slotsBoxes}>
                            {[1, 2, 3].map((slot) => (
                                <View
                                    key={slot}
                                    style={[
                                        styles.slotBox,
                                        slot <= claimedSlots ? styles.slotBoxFilled : styles.slotBoxEmpty,
                                    ]}
                                >
                                    <Text style={[
                                        styles.slotNumber,
                                        slot <= claimedSlots ? styles.slotNumberFilled : styles.slotNumberEmpty,
                                    ]}>
                                        {slot}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    <View style={styles.slotsRight}>
                        <Text style={[styles.slotsCount, { color: stateStyles.slotColor }]}>
                            {claimedSlots}/{maxSlots}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: stateStyles.slotBg }]}>
                            <Text style={[styles.statusText, { color: stateStyles.statusColor }]}>
                                {stateStyles.statusText}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Tenant Info */}
                <View style={styles.tenantRow}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {tenantName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.tenantInfo}>
                        <Text style={styles.tenantName}>{tenantName}</Text>
                        <Text style={styles.tenantStatus}>
                            {lead.phone_verified ? 'Verified Renter' : 'Renter'}
                        </Text>
                    </View>
                    {isUnlocked && (
                        <View style={styles.unlockedBadge}>
                            <Feather name="check-circle" size={12} color={COLORS.success} />
                            <Text style={styles.unlockedText}>Unlocked</Text>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                    {isUnlocked ? (
                        <View style={styles.actionsRow}>
                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={() => handleCall(lead)}
                            >
                                <Feather name="phone" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.callButtonText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.chatButton}
                                onPress={() => handleWhatsApp(lead)}
                            >
                                <Feather name="message-circle" size={14} color="#FFFFFF" />
                                <Text style={styles.chatButtonText}>Chat</Text>
                            </TouchableOpacity>
                        </View>
                    ) : isExpired ? (
                        <TouchableOpacity style={styles.expiredButton} disabled>
                            <Feather name="clock" size={16} color={COLORS.expired} />
                            <Text style={styles.expiredButtonText}>EXPIRED</Text>
                        </TouchableOpacity>
                    ) : isSoldOut ? (
                        <TouchableOpacity style={styles.soldOutButton} disabled>
                            <Feather name="x-circle" size={16} color={COLORS.error} />
                            <Text style={styles.soldOutButtonText}>SOLD OUT</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.unlockActions}>
                            <TouchableOpacity
                                style={styles.unlockButton}
                                onPress={() => handleUnlock(lead, false)}
                                activeOpacity={0.9}
                            >
                                <Feather name="zap" size={16} color="#FFFFFF" />
                                <Text style={styles.unlockButtonText}>
                                    Unlock · {unlockCost} Credits
                                </Text>
                            </TouchableOpacity>

                            {canBuyExclusive && (
                                <TouchableOpacity
                                    style={styles.exclusiveButton}
                                    onPress={() => handleUnlock(lead, true)}
                                    activeOpacity={0.8}
                                >
                                    <Feather name="award" size={14} color={COLORS.primary} />
                                    <Text style={styles.exclusiveButtonText}>
                                        Buy Exclusive Access · {exclusiveCost} Credits
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading leads...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
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
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    // Header
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
    // Lead Card
    leadCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    disabledCard: {
        opacity: 0.75,
    },
    disabledText: {
        color: COLORS.expired,
    },
    // Top Row
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    statsContainer: {
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
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
    },
    budgetBadge: {
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    budgetBadgeHigh: {
        backgroundColor: 'rgba(254, 146, 0, 0.1)',
        borderColor: 'rgba(254, 146, 0, 0.2)',
    },
    budgetText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: COLORS.success,
    },
    budgetTextHigh: {
        color: COLORS.primary,
    },
    // Title
    leadTitle: {
        fontSize: 17,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    // Tags
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tagText: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    // Slots Container
    slotsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
    },
    slotsLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    slotsLabel: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    slotsBoxes: {
        flexDirection: 'row',
        gap: 4,
    },
    slotBox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    slotBoxFilled: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    slotBoxEmpty: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
    },
    slotNumber: {
        fontSize: 10,
        fontFamily: FONTS.bold,
    },
    slotNumberFilled: {
        color: '#FFFFFF',
    },
    slotNumberEmpty: {
        color: '#D1D5DB',
    },
    slotsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    slotsCount: {
        fontSize: 12,
        fontFamily: FONTS.bold,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 9,
        fontFamily: FONTS.bold,
        letterSpacing: 0.3,
    },
    // Tenant Row
    tenantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatarText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
    },
    tenantInfo: {
        flex: 1,
    },
    tenantName: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    tenantStatus: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    unlockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    unlockedText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.success,
    },
    // Actions
    actionsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    callButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 40,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
    },
    callButtonText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    chatButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 40,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
    chatButtonText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: '#FFFFFF',
    },
    unlockActions: {
        gap: 10,
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
    unlockButtonText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
    },
    exclusiveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 40,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: 'rgba(254, 146, 0, 0.3)',
        borderRadius: 10,
    },
    exclusiveButtonText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.primary,
    },
    expiredButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        backgroundColor: COLORS.border,
        borderRadius: 10,
    },
    expiredButtonText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: COLORS.expired,
        letterSpacing: 0.5,
    },
    soldOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        backgroundColor: '#FEE2E2',
        borderRadius: 10,
    },
    soldOutButtonText: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: COLORS.error,
        letterSpacing: 0.5,
    },
});

export default AgentLeadsScreen;
