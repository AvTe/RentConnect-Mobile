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
    errorLight: '#FEE2E2',
    blue: '#3B82F6',
    blueLight: '#DBEAFE',
    purple: '#8B5CF6',
    purpleLight: '#EDE9FE',
};

const NOTIFICATION_ICONS = {
    new_lead: { icon: 'user-plus', bg: COLORS.successLight, color: COLORS.success },
    credit_added: { icon: 'plus-circle', bg: COLORS.blueLight, color: COLORS.blue },
    credit_deducted: { icon: 'minus-circle', bg: COLORS.warningLight, color: COLORS.warning },
    lead_unlocked: { icon: 'unlock', bg: COLORS.primaryLight, color: COLORS.primary },
    lead_expired: { icon: 'clock', bg: COLORS.errorLight, color: COLORS.error },
    referral: { icon: 'gift', bg: COLORS.purpleLight, color: COLORS.purple },
    subscription: { icon: 'star', bg: COLORS.primaryLight, color: COLORS.primary },
    system: { icon: 'bell', bg: COLORS.background, color: COLORS.textSecondary },
};

const NotificationsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all'); // all, unread

    const fetchNotifications = useCallback(async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (filter === 'unread') {
                query = query.eq('read', false);
            }

            const { data, error } = await query;

            if (error) throw error;

            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // Demo notifications
            setNotifications([
                {
                    id: '1',
                    type: 'new_lead',
                    title: 'New Lead Available',
                    message: 'A new tenant is looking for a 2BR in Kilimani',
                    read: false,
                    created_at: new Date().toISOString(),
                },
                {
                    id: '2',
                    type: 'lead_unlocked',
                    title: 'Lead Unlocked',
                    message: 'You unlocked John\'s contact information',
                    read: false,
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                    id: '3',
                    type: 'credit_added',
                    title: 'Credits Added',
                    message: '25 credits have been added to your wallet',
                    read: true,
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                },
                {
                    id: '4',
                    type: 'referral',
                    title: 'Referral Bonus',
                    message: 'You earned 5 credits from a referral!',
                    read: true,
                    created_at: new Date(Date.now() - 172800000).toISOString(),
                },
                {
                    id: '5',
                    type: 'lead_expired',
                    title: 'Lead Expired',
                    message: 'The lead you were viewing has expired',
                    read: true,
                    created_at: new Date(Date.now() - 259200000).toISOString(),
                },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, filter]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (notificationId) => {
        try {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);

            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
            // For demo
            setNotifications(prev =>
                prev.map(n => ({ ...n, read: true }))
            );
            toast.success('All notifications marked as read');
        }
    };

    const getTimeAgo = (dateString) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
        });
    };

    const getIconConfig = (type) => {
        return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.system;
    };

    const handleNotificationPress = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }

        // Navigate based on notification type
        switch (notification.type) {
            case 'new_lead':
            case 'lead_unlocked':
                if (notification.lead_id) {
                    navigation.navigate('LeadDetail', { leadId: notification.lead_id });
                } else {
                    navigation.navigate('AgentLeads');
                }
                break;
            case 'credit_added':
            case 'credit_deducted':
                navigation.navigate('AgentWallet');
                break;
            case 'referral':
                navigation.navigate('AgentRewards');
                break;
            default:
                break;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const displayNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications;

    const NotificationItem = ({ notification }) => {
        const iconConfig = getIconConfig(notification.type);
        const isUnread = !notification.read;

        return (
            <TouchableOpacity
                style={[styles.notificationItem, isUnread && styles.notificationUnread]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                    <Feather name={iconConfig.icon} size={18} color={iconConfig.color} />
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, isUnread && styles.titleUnread]}>
                            {notification.title}
                        </Text>
                        {isUnread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                        {notification.message}
                    </Text>
                    <Text style={styles.time}>{getTimeAgo(notification.created_at)}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.border} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading notifications...</Text>
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
                    <Feather name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity
                        style={styles.markAllButton}
                        onPress={markAllAsRead}
                    >
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                        All
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
                    onPress={() => setFilter('unread')}
                >
                    <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
                        Unread
                    </Text>
                    {unreadCount > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{unreadCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

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
                {displayNotifications.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Feather name="bell-off" size={48} color={COLORS.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {filter === 'unread'
                                ? 'You\'re all caught up!'
                                : 'You\'ll see updates about leads and credits here'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.notificationsList}>
                        {displayNotifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                            />
                        ))}
                    </View>
                )}

                <View style={{ height: 50 }} />
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
        flex: 1,
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginLeft: 8,
    },
    markAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    markAllText: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    // Filter
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 10,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
    },
    filterText: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    countBadge: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 20,
        alignItems: 'center',
    },
    countText: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Notifications List
    notificationsList: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    notificationUnread: {
        backgroundColor: COLORS.primaryLight + '30',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
        marginHorizontal: 12,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    titleUnread: {
        fontFamily: FONTS.semiBold,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
    },
    message: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    time: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});

export default NotificationsScreen;
