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
    Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
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
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
};

const FILTER_TABS = ['All', 'Contacted', 'Converted', 'Pending'];

const AgentPropertiesScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [connectedLeads, setConnectedLeads] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    const fetchConnectedLeads = useCallback(async () => {
        if (!user?.id) return;

        try {
            // Use contact_history table to get unlocked leads
            const { data, error, count } = await supabase
                .from('contact_history')
                .select(`
                    *,
                    leads (*)
                `, { count: 'exact' })
                .eq('agent_id', user.id)
                .in('contact_type', ['unlock', 'exclusive'])
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to match expected format
            const transformedData = (data || []).map(item => ({
                id: item.id,
                status: item.status || 'pending',
                contacted_at: item.created_at,
                leads: item.leads,
            }));

            setConnectedLeads(transformedData);
            setTotalCount(count || transformedData.length);
        } catch (error) {
            console.error('Error fetching connected leads:', error);
            setConnectedLeads([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchConnectedLeads();
    }, [fetchConnectedLeads]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchConnectedLeads();
    };

    const handleCall = (phone) => {
        if (!phone) {
            toast.warning('No phone number available for this lead');
            return;
        }
        Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
    };

    const handleMessage = (phone) => {
        if (!phone) {
            toast.warning('No phone number available for this lead');
            return;
        }
        Linking.openURL(`https://wa.me/${phone.replace(/[+\s]/g, '')}`);
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'converted':
                return { label: 'Converted', color: COLORS.success, bg: COLORS.successLight };
            case 'contacted':
                return { label: 'Contacted', color: COLORS.warning, bg: COLORS.warningLight };
            default:
                return { label: 'Pending', color: COLORS.textSecondary, bg: COLORS.background };
        }
    };

    const getTimeAgo = (dateString) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days}d ago`;
    };

    const filteredLeads = connectedLeads.filter(item => {
        const lead = item.leads;
        const matchesSearch = searchQuery === '' ||
            lead?.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead?.location?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'All' ||
            item.status?.toLowerCase() === activeFilter.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const FilterTab = ({ label, isActive, onPress }) => (
        <TouchableOpacity
            style={[styles.filterTab, isActive && styles.filterTabActive]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const LeadCard = ({ item }) => {
        const lead = item.leads;
        const statusConfig = getStatusConfig(item.status);
        const initials = lead?.tenant_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'TN';

        return (
            <View style={styles.leadCard}>
                <View style={styles.leadHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={styles.leadInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.leadName}>{lead?.tenant_name || 'Tenant'}</Text>
                            {lead?.phone_verified && (
                                <Feather name="check-circle" size={14} color={COLORS.success} />
                            )}
                        </View>
                        <View style={styles.statusRow}>
                            <Text style={styles.timeText}>Unlocked {getTimeAgo(item.contacted_at)}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                                <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
                                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                    {statusConfig.label}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.lookingRow}>
                    <Text style={styles.lookingLabel}>LOOKING:</Text>
                    <Text style={styles.lookingValue}>{lead?.property_type || 'Property'}</Text>
                    <Feather name="map-pin" size={12} color={COLORS.primary} />
                    <Text style={styles.locationText}>{lead?.location || 'TBD'}</Text>
                </View>

                <View style={styles.phoneRow}>
                    <Text style={styles.phoneText}>{lead?.tenant_phone || 'No phone'}</Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleCall(lead?.tenant_phone)}
                        >
                            <Feather name="phone" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.messageButton]}
                            onPress={() => handleMessage(lead?.tenant_phone)}
                        >
                            <Feather name="message-circle" size={18} color="#25D366" />
                        </TouchableOpacity>
                    </View>
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="arrow-left" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Properties</Text>
                <TouchableOpacity style={styles.headerIcon}>
                    <Feather name="bell" size={22} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Feather name="search" size={18} color={COLORS.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, location"
                    placeholderTextColor={COLORS.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <View>
                    <Text style={styles.sectionTitle}>Connected Leads</Text>
                    <Text style={styles.sectionSubtitle}>People you've unlocked for</Text>
                </View>
                <Text style={styles.totalCount}>{totalCount} Total</Text>
            </View>

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterRow}
            >
                {FILTER_TABS.map((tab) => (
                    <FilterTab
                        key={tab}
                        label={tab}
                        isActive={activeFilter === tab}
                        onPress={() => setActiveFilter(tab)}
                    />
                ))}
            </ScrollView>

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
                        <Feather name="users" size={48} color={COLORS.textSecondary} />
                        <Text style={styles.emptyTitle}>No leads found</Text>
                        <Text style={styles.emptyText}>
                            {searchQuery ? 'Try adjusting your search' : 'Unlock leads to see them here'}
                        </Text>
                    </View>
                ) : (
                    filteredLeads.map((item) => (
                        <LeadCard key={item.id} item={item} />
                    ))
                )}

                {/* Upsell Card */}
                <View style={styles.upsellCard}>
                    <Feather name="zap" size={20} color={COLORS.primary} />
                    <Text style={styles.upsellText}>Need More Credits?</Text>
                    <TouchableOpacity
                        style={styles.upsellButton}
                        onPress={() => toast.info('View plans coming soon')}
                    >
                        <Text style={styles.upsellButtonText}>View New Plans</Text>
                    </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    headerIcon: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 12,
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
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    sectionSubtitle: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    totalCount: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.textSecondary,
    },
    filterScroll: {
        maxHeight: 50,
        marginBottom: 12,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterTabText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    filterTabTextActive: {
        color: '#FFFFFF',
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
    leadCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    leadHeader: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatarText: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    leadInfo: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    leadName: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 10,
    },
    timeText: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontFamily: 'DMSans_600SemiBold',
    },
    lookingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 6,
    },
    lookingLabel: {
        fontSize: 11,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    lookingValue: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    locationText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    phoneText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    messageButton: {
        backgroundColor: '#E7F8EF',
    },
    upsellCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    upsellText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    upsellButton: {
        backgroundColor: COLORS.card,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    upsellButtonText: {
        fontSize: 13,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
});

export default AgentPropertiesScreen;
