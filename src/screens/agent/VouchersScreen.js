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
import {
    getAgentVouchers,
    redeemVoucher,
    markVoucherViewed,
    getVoucherStats,
} from '../../lib/voucherService';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    error: '#EF4444',
    purple: '#8B5CF6',
    purpleLight: '#EDE9FE',
};

const FILTER_TABS = ['All', 'Active', 'Redeemed', 'Expired'];

const VouchersScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [vouchers, setVouchers] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');

    const loadData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const filters = {};
            if (activeFilter !== 'All') {
                filters.status = activeFilter.toLowerCase();
            }

            const [vouchersResult, statsResult] = await Promise.all([
                getAgentVouchers(user.id, filters),
                getVoucherStats(user.id),
            ]);

            if (vouchersResult.success) setVouchers(vouchersResult.data);
            if (statsResult.success) setStats(statsResult.data);
        } catch (error) {
            toast.error('Failed to load vouchers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, activeFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleRedeem = async (voucher) => {
        try {
            const result = await redeemVoucher(voucher.id, user.id);
            if (result.success) {
                toast.success('Voucher redeemed successfully!');
                loadData();
            } else {
                toast.error(result.error || 'Failed to redeem voucher');
            }
        } catch (error) {
            toast.error('Something went wrong');
        }
    };

    const handleView = async (voucher) => {
        await markVoucherViewed(voucher.id, user.id);
    };

    const getVoucherStatus = (voucher) => {
        if (voucher.is_redeemed) return 'redeemed';
        if (new Date(voucher.expires_at) < new Date()) return 'expired';
        return 'active';
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'active':
                return { label: 'Active', color: COLORS.success, bg: COLORS.successLight, icon: 'gift' };
            case 'redeemed':
                return { label: 'Redeemed', color: COLORS.purple, bg: COLORS.purpleLight, icon: 'check-circle' };
            case 'expired':
                return { label: 'Expired', color: COLORS.textLight, bg: '#F3F4F6', icon: 'clock' };
            default:
                return { label: 'Unknown', color: COLORS.textLight, bg: '#F3F4F6', icon: 'help-circle' };
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatValue = (value) => `KES ${Number(value || 0).toLocaleString()}`;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Vouchers</Text>
                <View style={{ width: 32 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
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
                    {/* Stats */}
                    {stats && (
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
                                    <Feather name="gift" size={18} color={COLORS.primary} />
                                </View>
                                <Text style={styles.statValue}>{stats.active}</Text>
                                <Text style={styles.statLabel}>Active</Text>
                            </View>
                            <View style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: COLORS.purpleLight }]}>
                                    <Feather name="check-circle" size={18} color={COLORS.purple} />
                                </View>
                                <Text style={styles.statValue}>{stats.redeemed}</Text>
                                <Text style={styles.statLabel}>Redeemed</Text>
                            </View>
                            <View style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
                                    <Feather name="dollar-sign" size={18} color={COLORS.success} />
                                </View>
                                <Text style={styles.statValue}>{formatValue(stats.redeemedValue)}</Text>
                                <Text style={styles.statLabel}>Saved</Text>
                            </View>
                        </View>
                    )}

                    {/* Filters */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollWrap}>
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

                    {/* Voucher List */}
                    {vouchers.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Feather name="gift" size={36} color={COLORS.textLight} />
                            </View>
                            <Text style={styles.emptyTitle}>No vouchers</Text>
                            <Text style={styles.emptySubtitle}>
                                Vouchers will appear here when you earn them through activities
                            </Text>
                        </View>
                    ) : (
                        vouchers.map((voucher) => {
                            const status = getVoucherStatus(voucher);
                            const cfg = getStatusConfig(status);

                            return (
                                <TouchableOpacity
                                    key={voucher.id}
                                    style={styles.voucherCard}
                                    onPress={() => handleView(voucher)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.voucherLeft}>
                                        <View style={[styles.voucherIcon, { backgroundColor: cfg.bg }]}>
                                            <Feather name={cfg.icon} size={20} color={cfg.color} />
                                        </View>
                                    </View>
                                    <View style={styles.voucherCenter}>
                                        <Text style={styles.voucherTitle}>{voucher.title || 'Voucher'}</Text>
                                        {voucher.code && (
                                            <Text style={styles.voucherCode}>{voucher.code}</Text>
                                        )}
                                        <View style={styles.voucherMeta}>
                                            <Text style={styles.voucherDate}>
                                                Expires: {formatDate(voucher.expires_at)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.voucherRight}>
                                        <Text style={[styles.voucherValue, { color: cfg.color }]}>
                                            {formatValue(voucher.value)}
                                        </Text>
                                        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                                            <Text style={[styles.statusText, { color: cfg.color }]}>
                                                {cfg.label}
                                            </Text>
                                        </View>
                                        {status === 'active' && (
                                            <TouchableOpacity
                                                style={styles.redeemBtn}
                                                onPress={() => handleRedeem(voucher)}
                                            >
                                                <Text style={styles.redeemBtnText}>Redeem</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })
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
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    filterScrollWrap: {
        marginBottom: 16,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 30,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 8,
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
    voucherCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 10,
    },
    voucherLeft: {
        marginRight: 12,
    },
    voucherIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voucherCenter: {
        flex: 1,
    },
    voucherTitle: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 2,
    },
    voucherCode: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.primary,
        marginBottom: 4,
    },
    voucherMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    voucherDate: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textLight,
    },
    voucherRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    voucherValue: {
        fontSize: 15,
        fontFamily: 'DMSans_700Bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 4,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'DMSans_600SemiBold',
    },
    redeemBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 6,
    },
    redeemBtnText: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 50,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});

export default VouchersScreen;
