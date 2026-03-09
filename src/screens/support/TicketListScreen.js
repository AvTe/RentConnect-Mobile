import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getUserTickets, TICKET_CATEGORIES } from '../../lib/ticketService';
import { COLORS, FONTS } from '../../constants/theme';

const STATUS_CONFIG = {
    open: { label: 'Open', color: COLORS.primary, bg: COLORS.primaryLight },
    in_progress: { label: 'In Progress', color: '#2563EB', bg: '#DBEAFE' },
    resolved: { label: 'Resolved', color: COLORS.success, bg: '#D1FAE5' },
    closed: { label: 'Closed', color: COLORS.textSecondary, bg: '#F3F4F6' },
};

const FILTER_TABS = ['All', 'Open', 'In Progress', 'Resolved'];

const TicketListScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [activeFilter, setActiveFilter] = useState('All');

    const loadTickets = useCallback(async () => {
        if (!user?.id) return;
        try {
            const filters = {};
            if (activeFilter === 'Open') filters.status = 'open';
            else if (activeFilter === 'In Progress') filters.status = 'in_progress';
            else if (activeFilter === 'Resolved') filters.status = 'resolved';

            const result = await getUserTickets(user.id, filters);
            if (result.success) {
                setTickets(result.data);
            } else {
                toast.error('Failed to load tickets');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, activeFilter]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadTickets();
        });
        return unsubscribe;
    }, [navigation, loadTickets]);

    const onRefresh = () => {
        setRefreshing(true);
        loadTickets();
    };

    const getCategoryIcon = (category) => {
        const cat = TICKET_CATEGORIES.find(c => c.id === category);
        return cat ? cat.icon : 'help-circle';
    };

    const getStatusConfig = (status) => {
        return STATUS_CONFIG[status] || STATUS_CONFIG.open;
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    const renderTicketCard = (ticket) => {
        const statusCfg = getStatusConfig(ticket.status);
        const replyCount = ticket.replies?.length || 0;

        return (
            <TouchableOpacity
                key={ticket.id}
                style={styles.ticketCard}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                activeOpacity={0.7}
            >
                <View style={styles.ticketHeader}>
                    <View style={styles.ticketIconWrap}>
                        <Feather name={getCategoryIcon(ticket.category)} size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.ticketMeta}>
                        <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                        <Text style={styles.ticketTime}>{formatDate(ticket.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                </View>
                <Text style={styles.ticketMessage} numberOfLines={2}>{ticket.message}</Text>
                <View style={styles.ticketFooter}>
                    <View style={styles.footerItem}>
                        <Feather name="tag" size={13} color={COLORS.textLight} />
                        <Text style={styles.footerText}>{ticket.category || 'General'}</Text>
                    </View>
                    {replyCount > 0 && (
                        <View style={styles.footerItem}>
                            <Feather name="message-circle" size={13} color={COLORS.textLight} />
                            <Text style={styles.footerText}>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</Text>
                        </View>
                    )}
                    <Feather name="chevron-right" size={16} color={COLORS.textLight} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Support Tickets</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateTicket')}
                    style={styles.addBtn}
                >
                    <Feather name="plus" size={22} color={COLORS.primary} />
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTER_TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                            onPress={() => setActiveFilter(tab)}
                        >
                            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading tickets...</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                    }
                >
                    {tickets.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Feather name="inbox" size={40} color={COLORS.textLight} />
                            </View>
                            <Text style={styles.emptyTitle}>No tickets found</Text>
                            <Text style={styles.emptySubtitle}>
                                {activeFilter !== 'All'
                                    ? `No ${activeFilter.toLowerCase()} tickets yet`
                                    : 'Create a support ticket to get help'}
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyBtn}
                                onPress={() => navigation.navigate('CreateTicket')}
                            >
                                <Feather name="plus" size={18} color="#FFFFFF" />
                                <Text style={styles.emptyBtnText}>Create Ticket</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        tickets.map(renderTicketCard)
                    )}
                    <View style={{ height: 30 }} />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    addBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterRow: {
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterScroll: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 30,
        backgroundColor: COLORS.background,
        marginRight: 8,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
    },
    filterTabText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    filterTabTextActive: {
        color: '#FFFFFF',
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    ticketCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 12,
    },
    ticketHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    ticketIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    ticketMeta: { flex: 1 },
    ticketSubject: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    ticketTime: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontFamily: FONTS.semiBold,
    },
    ticketMessage: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    ticketFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 14,
        gap: 4,
    },
    footerText: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 8,
    },
    emptyBtnText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
});

export default TicketListScreen;
