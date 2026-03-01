import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import {
    fetchLeads,
    getUnlockedLeadIds,
    getLeadState,
    calculateUnlockCost,
    calculateExclusiveCost,
    getRemainingTime,
    unlockLead,
    subscribeToLeads,
    LEAD_STATE_STYLES,
} from '../../lib/leadService';
import { getWalletBalance } from '../../lib/database';

// Static colors for styles (light mode defaults)
// Dynamic theming is applied via inline styles using colors from useTheme
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
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leads, setLeads] = useState([]);
    const [unlockedLeadIds, setUnlockedLeadIds] = useState(new Set());
    const [creditBalance, setCreditBalance] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [totalLeads, setTotalLeads] = useState(0);
    const [sortBy, setSortBy] = useState('newest');
    const [showSortMenu, setShowSortMenu] = useState(false);

    const SORT_OPTIONS = [
        { key: 'newest', label: 'Newest First', icon: 'clock' },
        { key: 'budget_high', label: 'Budget: High → Low', icon: 'trending-up' },
        { key: 'budget_low', label: 'Budget: Low → High', icon: 'trending-down' },
        { key: 'slots', label: 'Most Slots Available', icon: 'layers' },
    ];

    const activeLeads = useMemo(() => {
        return leads.filter(lead => {
            const state = getLeadState(lead, unlockedLeadIds.has(lead.id));
            return state !== 'expired' && state !== 'sold_out';
        }).length;
    }, [leads, unlockedLeadIds]);

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

    // Real-time lead subscription — matches web's subscribeToLeads
    useEffect(() => {
        const unsubscribe = subscribeToLeads({}, (payload) => {
            // Refresh leads list on any INSERT, UPDATE, or DELETE
            if (payload.eventType === 'INSERT') {
                // New lead added — refresh to show it
                loadData();
            } else if (payload.eventType === 'UPDATE') {
                // Lead updated (slots, status, etc.) — update in place
                setLeads(prev => prev.map(lead =>
                    lead.id === payload.new.id ? { ...lead, ...payload.new } : lead
                ));
            } else if (payload.eventType === 'DELETE') {
                // Lead removed
                setLeads(prev => prev.filter(lead => lead.id !== payload.old.id));
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

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
    }).sort((a, b) => {
        switch (sortBy) {
            case 'budget_high':
                return (b.budget || 0) - (a.budget || 0);
            case 'budget_low':
                return (a.budget || 0) - (b.budget || 0);
            case 'slots': {
                const slotsA = (a.max_slots || 3) - (a.claimed_slots || 0);
                const slotsB = (b.max_slots || 3) - (b.claimed_slots || 0);
                return slotsB - slotsA;
            }
            case 'newest':
            default:
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
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
            <TouchableOpacity
                style={[styles.leadCard, (isExpired || isSoldOut) && styles.disabledCard]}
                onPress={() => navigation.navigate('LeadDetail', { leadId: lead.id })}
                activeOpacity={0.95}
            >
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
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading leads...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
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
                {/* Header — scrolls with page */}
                <View style={[styles.header, { backgroundColor: colors.card }]}>
                    <View style={styles.headerTop}>
                        <View style={styles.headerLeft}>
                            <Feather name="home" size={22} color={colors.primary} />
                            <Text style={[styles.logoText, { color: colors.text }]}>yoombaa</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={[styles.headerIconBtn, { backgroundColor: colors.background }]}
                                onPress={() => navigation.navigate('Notifications')}
                            >
                                <Feather name="bell" size={20} color={colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.avatarButton, { backgroundColor: colors.primaryLight }]}
                                onPress={() => navigation.navigate('AgentProfileEdit')}
                            >
                                <Feather name="user" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search bar in header area */}
                    <TouchableOpacity
                        style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('LeadSearch')}
                    >
                        <Feather name="search" size={16} color={colors.textSecondary} />
                        <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>
                            Search leads...
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Hero — Active Leads + Credits only */}
                <View style={[styles.heroSection, { backgroundColor: colors.card }]}>
                    <View style={styles.heroRow}>
                        <View style={styles.heroCard}>
                            <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(254, 146, 0, 0.10)' }]}>
                                <Feather name="zap" size={18} color={COLORS.primary} />
                            </View>
                            <Text style={[styles.heroValue, { color: colors.text }]}>{activeLeads}</Text>
                            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Active Leads</Text>
                        </View>
                        <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity style={styles.heroCard} onPress={() => navigation.navigate('AgentWallet')} activeOpacity={0.7}>
                            <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.10)' }]}>
                                <Feather name="credit-card" size={18} color={COLORS.success} />
                            </View>
                            <Text style={[styles.heroValue, { color: colors.text }]}>{creditBalance}</Text>
                            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Credits</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Leads Section Header */}
                <View style={styles.sectionHeader}>
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Leads</Text>
                        <View style={styles.leadCountRow}>
                            <Text style={[styles.leadCountText, { color: colors.textSecondary }]}>
                                {totalLeads} total
                            </Text>
                            <View style={[styles.countDot, { backgroundColor: colors.border }]} />
                            <Text style={[styles.leadCountText, { color: COLORS.primary }]}>
                                {activeLeads} active
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.filterButton, { borderColor: colors.border }]}
                        onPress={() => navigation.navigate('LeadFilters')}
                    >
                        <Feather name="sliders" size={14} color={colors.textSecondary} />
                        <Text style={[styles.filterBtnText, { color: colors.textSecondary }]}>Filter</Text>
                    </TouchableOpacity>
                </View>

                {/* Sort Row */}
                <TouchableOpacity
                    style={[styles.sortRow, { borderColor: colors.border }]}
                    onPress={() => setShowSortMenu(!showSortMenu)}
                    activeOpacity={0.7}
                >
                    <Feather name="bar-chart-2" size={14} color={COLORS.primary} />
                    <Text style={styles.sortLabel}>
                        {SORT_OPTIONS.find(s => s.key === sortBy)?.label || 'Newest First'}
                    </Text>
                    <Feather name={showSortMenu ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {showSortMenu && (
                    <View style={[styles.sortMenu, { borderColor: colors.border }]}>
                        {SORT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.key}
                                style={[styles.sortMenuItem, sortBy === opt.key && styles.sortMenuItemActive]}
                                onPress={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                            >
                                <Feather name={opt.icon} size={15}
                                    color={sortBy === opt.key ? COLORS.primary : COLORS.textSecondary} />
                                <Text style={[styles.sortMenuText,
                                    sortBy === opt.key && { color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }]}>
                                    {opt.label}
                                </Text>
                                {sortBy === opt.key && (
                                    <Feather name="check" size={16} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Leads List */}
                <View style={styles.leadsList}>
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
                </View>

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
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    // Header
    header: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 14,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoText: {
        fontSize: 20,
        fontFamily: 'DMSans_700Bold',
        marginLeft: 6,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    // Search bar (in header)
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        height: 42,
        borderRadius: 21,
        paddingHorizontal: 14,
        borderWidth: 1,
        gap: 10,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
    },
    // Hero
    heroSection: {
        marginTop: 8,
        marginHorizontal: 20,
        borderRadius: 16,
        overflow: 'hidden',
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 8,
    },
    heroCard: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    heroIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    heroValue: {
        fontSize: 28,
        fontFamily: 'DMSans_700Bold',
        lineHeight: 32,
    },
    heroLabel: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
    },
    heroDivider: {
        width: 1,
        height: 60,
        marginHorizontal: 4,
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: 'DMSans_700Bold',
    },
    leadCountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 3,
    },
    leadCountText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
    },
    countDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterBtnText: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
    },
    // Sort
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 20,
        marginBottom: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
    },
    sortLabel: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    sortMenu: {
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    sortMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        gap: 10,
    },
    sortMenuItemActive: {
        backgroundColor: '#FFF5E6',
    },
    sortMenuText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    leadsList: {
        paddingHorizontal: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
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
        fontFamily: 'DMSans_700Bold',
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
        fontFamily: 'DMSans_700Bold',
        color: COLORS.success,
    },
    budgetTextHigh: {
        color: COLORS.primary,
    },
    // Title
    leadTitle: {
        fontSize: 17,
        fontFamily: 'DMSans_700Bold',
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
        fontFamily: 'DMSans_500Medium',
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
        fontFamily: 'DMSans_700Bold',
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
        fontFamily: 'DMSans_700Bold',
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
        fontFamily: 'DMSans_700Bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 9,
        fontFamily: 'DMSans_700Bold',
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
        fontFamily: 'DMSans_700Bold',
        color: COLORS.textSecondary,
    },
    tenantInfo: {
        flex: 1,
    },
    tenantName: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    tenantStatus: {
        fontSize: 11,
        fontFamily: 'DMSans_400Regular',
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
        fontFamily: 'DMSans_700Bold',
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
        borderRadius: 30,
    },
    callButtonText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
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
        borderRadius: 30,
    },
    chatButtonText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
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
        borderRadius: 30,
    },
    unlockButtonText: {
        fontSize: 14,
        fontFamily: 'DMSans_700Bold',
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
        borderRadius: 30,
    },
    exclusiveButtonText: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.primary,
    },
    expiredButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        backgroundColor: COLORS.border,
        borderRadius: 30,
    },
    expiredButtonText: {
        fontSize: 12,
        fontFamily: 'DMSans_700Bold',
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
        borderRadius: 30,
    },
    soldOutButtonText: {
        fontSize: 12,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.error,
        letterSpacing: 0.5,
    },
});

export default AgentLeadsScreen;
