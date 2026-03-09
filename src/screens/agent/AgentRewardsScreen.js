import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getReferralCode, getReferralStats } from '../../lib/database';
import { getAgentVouchers, getVoucherStats, redeemVoucher } from '../../lib/voucherService';
import { COLORS, FONTS } from '../../constants/theme';

const TAB_OPTIONS = ['Referrals', 'Vouchers'];
const VOUCHER_FILTERS = ['All', 'Active', 'Redeemed', 'Expired'];

const AgentRewardsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState('Referrals');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Referral state
    const [referralCode, setReferralCode] = useState('');
    const [referralStats, setReferralStats] = useState({
        total: 0, pending: 0, completed: 0, creditsEarned: 0,
    });

    // Voucher state
    const [vouchers, setVouchers] = useState([]);
    const [voucherStats, setVoucherStats] = useState({
        total: 0, active: 0, redeemed: 0, expired: 0,
    });
    const [voucherFilter, setVoucherFilter] = useState('All');

    const loadData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const [codeResult, statsResult, vouchersResult, vStatsResult] = await Promise.all([
                getReferralCode(user.id).catch(() => ({ success: false })),
                getReferralStats(user.id).catch(() => ({ success: false })),
                getAgentVouchers(user.id).catch(() => ({ success: false })),
                getVoucherStats(user.id).catch(() => ({ success: false })),
            ]);

            if (codeResult?.success) setReferralCode(codeResult.code);
            if (statsResult?.success) setReferralStats(statsResult.stats || {
                total: 0, pending: 0, completed: 0, creditsEarned: 0,
            });
            if (vouchersResult?.success) setVouchers(vouchersResult.data || []);
            if (vStatsResult?.success) setVoucherStats(vStatsResult.data || vStatsResult.stats || {
                total: 0, active: 0, redeemed: 0, expired: 0,
            });
        } catch (error) {
            console.error('Error loading rewards data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => { loadData(); }, [loadData]);

    // Refresh data when screen comes back into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        return unsubscribe;
    }, [navigation, loadData]);

    const onRefresh = () => { setRefreshing(true); loadData(); };

    const handleCopyCode = async () => {
        if (!referralCode) return;
        await Clipboard.setStringAsync(referralCode);
        toast.success('Referral code copied!');
    };

    const handleShareReferral = async () => {
        if (!referralCode) return;
        try {
            await Share.share({
                message: `Join Yoombaa — Kenya's #1 Rental Marketplace! 🏠\n\nSign up as an agent and use my referral code: ${referralCode}\n\nGet 2 bonus credits when you sign up!\n\nhttps://yoombaa.com`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const handleRedeemVoucher = async (voucher) => {
        try {
            const result = await redeemVoucher(voucher.id, user.id);
            if (result.success) {
                toast.success('Voucher redeemed successfully!');
                loadData();
            } else {
                toast.error(result.error || 'Failed to redeem voucher');
            }
        } catch (error) {
            toast.error('Failed to redeem voucher');
        }
    };

    const filteredVouchers = vouchers.filter(v => {
        if (voucherFilter === 'All') return true;
        return v.status?.toLowerCase() === voucherFilter.toLowerCase();
    });

    const StatCard = ({ icon, iconBg, iconColor, value, label }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
                <Feather name={icon} size={18} color={iconColor} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const StepItem = ({ number, title, description }) => (
        <View style={styles.stepItem}>
            <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{number}</Text>
            </View>
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepDescription}>{description}</Text>
            </View>
        </View>
    );

    /* ── Referrals Tab ── */
    const renderReferrals = () => (
        <>
            {/* Referral Code Card */}
            <View style={styles.referralCodeCard}>
                <View style={styles.referralCodeHeader}>
                    <View style={styles.referralIconWrap}>
                        <Feather name="gift" size={22} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.referralCodeTitle}>Your Referral Code</Text>
                        <Text style={styles.referralCodeSubtitle}>Share & earn 5 credits per referral</Text>
                    </View>
                </View>

                <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>{referralCode || '---'}</Text>
                    <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                        <Feather name="copy" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.referralActions}>
                    <TouchableOpacity style={styles.shareButton} onPress={handleShareReferral} activeOpacity={0.8}>
                        <Feather name="share-2" size={18} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>Share Invite Link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.whatsappButton} onPress={handleShareReferral} activeOpacity={0.8}>
                        <Feather name="message-circle" size={18} color="#25D366" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Referral Stats */}
            <Text style={styles.sectionLabel}>REFERRAL STATS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.statsScroll} contentContainerStyle={styles.statsRow}>
                <StatCard icon="users" iconBg={COLORS.blueLight} iconColor={COLORS.blue}
                    value={referralStats.total} label="TOTAL" />
                <StatCard icon="clock" iconBg="#FEF3C7" iconColor="#F59E0B"
                    value={referralStats.pending} label="PENDING" />
                <StatCard icon="check-circle" iconBg={COLORS.successLight} iconColor={COLORS.success}
                    value={referralStats.completed} label="COMPLETED" />
                <StatCard icon="zap" iconBg={COLORS.primaryLight} iconColor={COLORS.primary}
                    value={referralStats.creditsEarned} label="CREDITS EARNED" />
            </ScrollView>

            {/* How Referrals Work */}
            <View style={styles.howItWorksCard}>
                <View style={styles.howItWorksHeader}>
                    <Feather name="info" size={18} color={COLORS.primary} />
                    <Text style={styles.howItWorksTitle}>How Referrals Work</Text>
                </View>
                <StepItem number="1" title="Share Your Code"
                    description="Share your unique referral code with other agents." />
                <StepItem number="2" title="Agent Signs Up"
                    description="They sign up using your code and get 2 bonus credits." />
                <StepItem number="3" title="Earn Credits"
                    description="You earn 5 credits when they make their first purchase!" />
            </View>
        </>
    );

    /* ── Vouchers Tab ── */
    const renderVouchers = () => (
        <>
            {/* Voucher Stats */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.statsScroll} contentContainerStyle={styles.statsRow}>
                <StatCard icon="gift" iconBg={COLORS.primary} iconColor="#FFFFFF"
                    value={voucherStats.total || 0} label="TOTAL" />
                <StatCard icon="check-circle" iconBg={COLORS.success} iconColor="#FFFFFF"
                    value={voucherStats.active || 0} label="ACTIVE" />
                <StatCard icon="award" iconBg={COLORS.purple} iconColor="#FFFFFF"
                    value={voucherStats.redeemed || 0} label="REDEEMED" />
            </ScrollView>

            {/* Voucher Filters */}
            <View style={styles.filterRow}>
                {VOUCHER_FILTERS.map((tab) => (
                    <TouchableOpacity key={tab}
                        style={[styles.filterTab, voucherFilter === tab && styles.filterTabActive]}
                        onPress={() => setVoucherFilter(tab)} activeOpacity={0.8}>
                        <Text style={[styles.filterTabText, voucherFilter === tab && styles.filterTabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Voucher List */}
            {filteredVouchers.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                        <Feather name="package" size={40} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.emptyTitle}>No vouchers</Text>
                    <Text style={styles.emptyText}>
                        Subscribe to premium plans to earn{'\n'}reward vouchers for Kenya brands!
                    </Text>
                    <TouchableOpacity style={styles.premiumButton}
                        onPress={() => navigation.navigate('Subscription')} activeOpacity={0.9}>
                        <Text style={styles.premiumButtonText}>View Plans</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                filteredVouchers.map((voucher) => (
                    <View key={voucher.id} style={styles.voucherCard}>
                        <View style={styles.voucherHeader}>
                            <View style={[styles.voucherBrand, { backgroundColor: COLORS.primaryLight }]}>
                                <Feather name="tag" size={20} color={COLORS.primary} />
                            </View>
                            <View style={styles.voucherInfo}>
                                <Text style={styles.voucherName}>
                                    {voucher.brand || voucher.name || 'Reward Voucher'}
                                </Text>
                                <Text style={styles.voucherValue}>
                                    KSh {Number(voucher.value || voucher.amount || 0).toLocaleString()}
                                </Text>
                            </View>
                            <View style={[styles.voucherStatus,
                                voucher.status === 'active' && { backgroundColor: COLORS.successLight },
                                voucher.status === 'redeemed' && { backgroundColor: COLORS.purpleLight },
                                voucher.status === 'expired' && { backgroundColor: '#F3F4F6' },
                            ]}>
                                <Text style={[styles.voucherStatusText,
                                    voucher.status === 'active' && { color: COLORS.success },
                                    voucher.status === 'redeemed' && { color: COLORS.purple },
                                    voucher.status === 'expired' && { color: COLORS.textSecondary },
                                ]}>
                                    {(voucher.status || 'active').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                        {voucher.code && (
                            <View style={styles.voucherCodeRow}>
                                <Text style={styles.voucherCode}>{voucher.code}</Text>
                            </View>
                        )}
                        {voucher.status === 'active' && (
                            <TouchableOpacity style={styles.redeemButton}
                                onPress={() => handleRedeemVoucher(voucher)} activeOpacity={0.8}>
                                <Text style={styles.redeemButtonText}>Redeem</Text>
                            </TouchableOpacity>
                        )}
                        {voucher.expires_at && (
                            <Text style={styles.voucherExpiry}>
                                Expires: {new Date(voucher.expires_at).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                ))
            )}
        </>
    );

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }, styles.centerContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Rewards</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                    <Feather name="bell" size={22} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabRow}>
                {TAB_OPTIONS.map((tab) => (
                    <TouchableOpacity key={tab}
                        style={[styles.tab, activeTab === tab && styles.tabActive]}
                        onPress={() => setActiveTab(tab)} activeOpacity={0.8}>
                        <Feather name={tab === 'Referrals' ? 'users' : 'gift'} size={16}
                            color={activeTab === tab ? COLORS.primary : COLORS.textSecondary} />
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
                {activeTab === 'Referrals' ? renderReferrals() : renderVouchers()}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centerContainer: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    headerTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
    // Tabs
    tabRow: {
        flexDirection: 'row', backgroundColor: COLORS.card,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 14, gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: COLORS.primary },
    tabText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    tabTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
    // Referral Code Card
    referralCodeCard: {
        backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
        marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
    },
    referralCodeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    referralIconWrap: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.primaryLight,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    referralCodeTitle: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text },
    referralCodeSubtitle: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    codeContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.background, borderRadius: 14,
        borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
        paddingHorizontal: 20, paddingVertical: 16, marginBottom: 16,
    },
    codeText: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.primary, letterSpacing: 2 },
    copyButton: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight,
        justifyContent: 'center', alignItems: 'center',
    },
    referralActions: { flexDirection: 'row', gap: 10 },
    shareButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, gap: 8,
    },
    shareButtonText: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#FFFFFF' },
    whatsappButton: {
        width: 52, height: 52, borderRadius: 14, backgroundColor: '#E6F9ED',
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#25D366',
    },
    // Stats
    sectionLabel: {
        fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.textSecondary,
        letterSpacing: 0.5, marginBottom: 12,
    },
    statsScroll: { marginHorizontal: -20, marginBottom: 24 },
    statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12 },
    statCard: {
        backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
        width: 130, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.border,
    },
    statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statValue: { fontSize: 26, fontFamily: FONTS.bold, color: COLORS.text },
    statLabel: { fontSize: 10, fontFamily: FONTS.semiBold, color: COLORS.textSecondary, letterSpacing: 0.3, marginTop: 4 },
    // How It Works
    howItWorksCard: {
        backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
        borderWidth: 1, borderColor: COLORS.border,
    },
    howItWorksHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 10 },
    howItWorksTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    stepItem: { flexDirection: 'row', marginBottom: 18 },
    stepNumber: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    stepNumberText: { fontSize: 14, fontFamily: FONTS.bold, color: '#FFFFFF' },
    stepContent: { flex: 1 },
    stepTitle: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text, marginBottom: 3 },
    stepDescription: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 18 },
    // Voucher Filter
    filterRow: { flexDirection: 'row', marginBottom: 20, gap: 8 },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
        backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    },
    filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    filterTabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    filterTabTextActive: { color: '#FFFFFF' },
    // Voucher Card
    voucherCard: {
        backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
    },
    voucherHeader: { flexDirection: 'row', alignItems: 'center' },
    voucherBrand: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    voucherInfo: { flex: 1 },
    voucherName: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.text },
    voucherValue: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 2 },
    voucherStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    voucherStatusText: { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 },
    voucherCodeRow: {
        marginTop: 12, backgroundColor: COLORS.background, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
    },
    voucherCode: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, letterSpacing: 1 },
    redeemButton: {
        backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12,
        alignItems: 'center', marginTop: 12,
    },
    redeemButtonText: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#FFFFFF' },
    voucherExpiry: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 8 },
    // Empty State
    emptyState: {
        alignItems: 'center', paddingVertical: 40, backgroundColor: COLORS.card,
        borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
    },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.background,
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 8 },
    emptyText: {
        fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary,
        textAlign: 'center', lineHeight: 20, marginBottom: 20,
    },
    premiumButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
    premiumButtonText: { fontSize: 15, fontFamily: FONTS.semiBold, color: '#FFFFFF' },
});

export default AgentRewardsScreen;
