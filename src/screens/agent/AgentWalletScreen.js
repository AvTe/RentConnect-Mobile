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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getWalletBalance, getWalletTransactions } from '../../lib/database';
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
    error: '#EF4444',
    errorLight: '#FEE2E2',
};

const TRANSACTION_ICONS = {
    purchase: { icon: 'credit-card', bg: '#DBEAFE', color: '#3B82F6' },
    unlock: { icon: 'unlock', bg: '#FEF3C7', color: '#F59E0B' },
    withdrawal: { icon: 'arrow-up-right', bg: '#F3F4F6', color: '#6B7280' },
    referral: { icon: 'gift', bg: '#D1FAE5', color: '#10B981' },
    bonus: { icon: 'star', bg: '#FEE2E2', color: '#EF4444' },
};

const AgentWalletScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);

    const fetchWalletData = useCallback(async () => {
        if (!user?.id) return;

        try {
            const balanceResult = await getWalletBalance(user.id);
            if (balanceResult.success) {
                setBalance(balanceResult.balance);
            }

            const transactionsResult = await getWalletTransactions(user.id);
            if (transactionsResult.success) {
                setTransactions(transactionsResult.transactions || []);
            }
        } catch (error) {
            console.error('Error fetching wallet data:', error);
            toast.error('Failed to load wallet data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchWalletData();
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        } else if (days === 1) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        } else {
            return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
        }
    };

    const getTransactionConfig = (type) => {
        return TRANSACTION_ICONS[type] || TRANSACTION_ICONS.purchase;
    };

    const formatAmount = (amount, type) => {
        const isPositive = ['purchase', 'referral', 'bonus'].includes(type);
        const prefix = isPositive ? '+' : '-';
        const color = isPositive ? COLORS.success : COLORS.textSecondary;
        return { text: `${prefix}${Math.abs(amount)} Credit${Math.abs(amount) !== 1 ? 's' : ''}`, color };
    };

    const ActionButton = ({ icon, label, onPress, isPrimary }) => (
        <TouchableOpacity
            style={[styles.actionButton, isPrimary && styles.actionButtonPrimary]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={[styles.actionIconContainer, isPrimary && styles.actionIconPrimary]}>
                <Feather name={icon} size={22} color={isPrimary ? COLORS.primary : COLORS.textSecondary} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const TransactionItem = ({ transaction }) => {
        const config = getTransactionConfig(transaction.type);
        const amountInfo = formatAmount(transaction.amount, transaction.type);

        return (
            <View style={styles.transactionItem}>
                <View style={[styles.transactionIcon, { backgroundColor: config.bg }]}>
                    <Feather name={config.icon} size={18} color={config.color} />
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{transaction.description || 'Transaction'}</Text>
                    <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: amountInfo.color }]}>
                    {amountInfo.text}
                </Text>
            </View>
        );
    };

    // Demo transactions for display
    const demoTransactions = [
        { id: 1, type: 'purchase', description: 'Credits Purchased', amount: 50, created_at: new Date().toISOString() },
        { id: 2, type: 'unlock', description: 'Lead Unlocked', amount: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 3, type: 'unlock', description: 'Lead Unlocked', amount: 1, created_at: new Date(Date.now() - 172800000).toISOString() },
        { id: 4, type: 'withdrawal', description: 'Withdrawal', amount: 500, created_at: new Date(Date.now() - 604800000).toISOString() },
    ];

    const displayTransactions = transactions.length > 0 ? transactions : demoTransactions;

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
                    <Text style={styles.headerTitle}>Wallet</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.headerIcon}>
                        <Feather name="bell" size={22} color={COLORS.text} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.avatarButton}>
                        <Text style={styles.avatarText}>
                            {userData?.name?.charAt(0).toUpperCase() || 'A'}
                        </Text>
                    </TouchableOpacity>
                </View>
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
                {/* Balance Card */}
                <LinearGradient
                    colors={['#FFF5E6', '#FFECD2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.balanceCard}
                >
                    <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
                    <View style={styles.balanceRow}>
                        <Text style={styles.balanceAmount}>{balance}</Text>
                        <Text style={styles.balanceUnit}>Credits</Text>
                    </View>
                </LinearGradient>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    <ActionButton
                        icon="plus"
                        label="Top Up"
                        isPrimary
                        onPress={() => toast.info('Top Up coming soon')}
                    />
                    <ActionButton
                        icon="arrow-down"
                        label="Withdraw"
                        onPress={() => toast.info('Withdraw coming soon')}
                    />
                    <ActionButton
                        icon="repeat"
                        label="Transfer"
                        onPress={() => toast.info('Transfer coming soon')}
                    />
                </View>

                {/* Transaction History */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Transaction History</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.transactionsList}>
                    {displayTransactions.map((transaction) => (
                        <TransactionItem key={transaction.id} transaction={transaction} />
                    ))}
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
    headerTitle: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginLeft: 12,
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
    avatarButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    balanceCard: {
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        marginBottom: 24,
    },
    balanceLabel: {
        fontSize: 12,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    balanceAmount: {
        fontSize: 56,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    balanceUnit: {
        fontSize: 20,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginLeft: 8,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 28,
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: COLORS.card,
        paddingVertical: 16,
        marginHorizontal: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionButtonPrimary: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionIconPrimary: {
        backgroundColor: COLORS.primaryLight,
    },
    actionLabel: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    seeAllText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    transactionsList: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        overflow: 'hidden',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    transactionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionInfo: {
        flex: 1,
        marginLeft: 14,
    },
    transactionTitle: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    transactionDate: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontFamily: FONTS.bold,
    },
});

export default AgentWalletScreen;
