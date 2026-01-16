import React, { useState, useEffect } from 'react';
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
};

const FILTER_TABS = ['All', 'Active', 'Used', 'Expired'];

const AgentRewardsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [vouchers, setVouchers] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        used: 0,
        expired: 0,
    });

    useEffect(() => {
        // Fetch vouchers here
        setLoading(false);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const StatCard = ({ icon, iconBg, value, label }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
                <Feather name={icon} size={18} color={COLORS.card} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

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
                <Text style={styles.headerTitle}>My Rewards</Text>
                <TouchableOpacity style={styles.headerIcon}>
                    <Feather name="bell" size={22} color={COLORS.text} />
                    <View style={styles.notificationDot} />
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
                {/* Overview Section */}
                <Text style={styles.sectionLabel}>OVERVIEW</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsScroll}
                    contentContainerStyle={styles.statsRow}
                >
                    <StatCard
                        icon="gift"
                        iconBg={COLORS.primary}
                        value={stats.total}
                        label="TOTAL VOUCHERS"
                    />
                    <StatCard
                        icon="check-circle"
                        iconBg={COLORS.success}
                        value={stats.active}
                        label="ACTIVE"
                    />
                    <StatCard
                        icon="clock"
                        iconBg={COLORS.textSecondary}
                        value={stats.used}
                        label="USED"
                    />
                </ScrollView>

                {/* Filter Tabs */}
                <View style={styles.filterRow}>
                    {FILTER_TABS.map((tab) => (
                        <FilterTab
                            key={tab}
                            label={tab}
                            isActive={activeFilter === tab}
                            onPress={() => setActiveFilter(tab)}
                        />
                    ))}
                </View>

                {/* Empty State */}
                {vouchers.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Feather name="package" size={48} color={COLORS.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No vouchers yet</Text>
                        <Text style={styles.emptyText}>
                            Subscribe to a premium plan to earn{'\n'}reward vouchers!
                        </Text>
                        <TouchableOpacity
                            style={styles.premiumButton}
                            onPress={() => toast.info('Premium plans coming soon')}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.premiumButtonText}>View Premium Plans</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Voucher list would go here
                    <View />
                )}

                {/* How It Works Section */}
                <View style={styles.howItWorksCard}>
                    <View style={styles.howItWorksHeader}>
                        <Feather name="star" size={20} color={COLORS.primary} />
                        <Text style={styles.howItWorksTitle}>How Reward Vouchers Work</Text>
                    </View>

                    <StepItem
                        number="1"
                        title="Subscribe to Premium"
                        description="Upgrade to a higher plan to unlock exclusive voucher rewards."
                    />
                    <StepItem
                        number="2"
                        title="Receive Your Voucher"
                        description="Get a digital voucher instantly after payment confirmation."
                    />
                    <StepItem
                        number="3"
                        title="Redeem & Enjoy"
                        description="Use at partner stores before expiry date."
                    />
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    statsScroll: {
        marginHorizontal: -20,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    statCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        width: 140,
        alignItems: 'flex-start',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 10,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
        marginTop: 4,
    },
    filterRow: {
        flexDirection: 'row',
        marginBottom: 24,
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
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    filterTabTextActive: {
        color: '#FFFFFF',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        marginBottom: 20,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    premiumButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
    },
    premiumButtonText: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    howItWorksCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
    },
    howItWorksHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    howItWorksTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    stepItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    stepNumberText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 4,
    },
    stepDescription: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 18,
    },
});

export default AgentRewardsScreen;
