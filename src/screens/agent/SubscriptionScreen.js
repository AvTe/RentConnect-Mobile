import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Linking,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    getAllSubscriptionPlans,
    getAllCreditBundles,
    getActiveSubscription,
    checkSubscriptionStatus,
} from '../../lib/subscriptionService';

const COLORS = {
    primary: '#FE9200',
    primaryDark: '#E58300',
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
    purple: '#8B5CF6',
};

const SubscriptionScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('plans');
    const [plans, setPlans] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);

    const loadData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const [plansResult, bundlesResult, statusResult] = await Promise.all([
                getAllSubscriptionPlans(),
                getAllCreditBundles(),
                checkSubscriptionStatus(user.id),
            ]);

            if (plansResult.success) setPlans(plansResult.data);
            if (bundlesResult.success) setBundles(bundlesResult.data);
            setSubscriptionStatus(statusResult);
            if (statusResult.isSubscribed) {
                setCurrentSubscription(statusResult.subscription);
            }
        } catch (error) {
            toast.error('Failed to load subscription data');
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

    const formatPrice = (price) => `KES ${Number(price).toLocaleString()}`;

    const handleSubscribe = (plan) => {
        Alert.alert(
            currentSubscription ? 'Upgrade Plan' : 'Subscribe',
            `${plan.name} — ${formatPrice(plan.price)}/${plan.duration_days ? `${plan.duration_days} days` : 'month'}\n\nYou will be redirected to complete payment on our secure web portal.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue to Payment',
                    onPress: () => {
                        const params = new URLSearchParams({
                            plan_id: plan.id,
                            user_id: user?.id || '',
                            source: 'mobile',
                        });
                        Linking.openURL(`https://yoombaa.com/pricing?${params.toString()}`)
                            .catch(() => toast.error('Could not open payment page'));
                    },
                },
            ]
        );
    };

    const handleBuyBundle = (bundle) => {
        Alert.alert(
            'Buy Credits',
            `${bundle.name || bundle.credits + ' Credits'} — ${formatPrice(bundle.price)}${bundle.bonus_credits > 0 ? ` (+${bundle.bonus_credits} bonus)` : ''}\n\nYou will be redirected to complete payment.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue to Payment',
                    onPress: () => {
                        const params = new URLSearchParams({
                            bundle_id: bundle.id,
                            user_id: user?.id || '',
                            source: 'mobile',
                        });
                        Linking.openURL(`https://yoombaa.com/pricing?${params.toString()}`)
                            .catch(() => toast.error('Could not open payment page'));
                    },
                },
            ]
        );
    };

    const renderCurrentPlan = () => {
        if (!currentSubscription) return null;

        const plan = currentSubscription.plan;
        return (
            <View style={styles.currentPlanCard}>
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    style={styles.currentPlanGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.currentPlanHeader}>
                        <View>
                            <Text style={styles.currentPlanLabel}>Current Plan</Text>
                            <Text style={styles.currentPlanName}>{plan?.name || 'Active Plan'}</Text>
                        </View>
                        <View style={styles.activeBadge}>
                            <Feather name="check-circle" size={14} color={COLORS.success} />
                            <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                    </View>
                    {subscriptionStatus?.daysRemaining != null && (
                        <View style={styles.daysRow}>
                            <Feather name="clock" size={14} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.daysText}>
                                {subscriptionStatus.daysRemaining} days remaining
                            </Text>
                        </View>
                    )}
                    {subscriptionStatus?.isExpiringSoon && (
                        <View style={styles.expiringBanner}>
                            <Feather name="alert-triangle" size={13} color={COLORS.warning} />
                            <Text style={styles.expiringText}>Expiring soon - Renew now</Text>
                        </View>
                    )}
                </LinearGradient>
            </View>
        );
    };

    const renderPlanCard = (plan) => {
        const isPopular = plan.is_popular || plan.name?.toLowerCase().includes('pro');
        return (
            <View key={plan.id} style={[styles.planCard, isPopular && styles.planCardPopular]}>
                {isPopular && (
                    <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>Popular</Text>
                    </View>
                )}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                <Text style={styles.planDuration}>
                    /{plan.duration_days ? `${plan.duration_days} days` : 'month'}
                </Text>

                {plan.features && (
                    <View style={styles.featuresList}>
                        {(Array.isArray(plan.features) ? plan.features : []).map((feature, idx) => (
                            <View key={idx} style={styles.featureRow}>
                                <Feather name="check" size={14} color={COLORS.success} />
                                <Text style={styles.featureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.selectBtn, isPopular && styles.selectBtnPopular]}
                    onPress={() => handleSubscribe(plan)}
                >
                    <Text style={[styles.selectBtnText, isPopular && styles.selectBtnTextPopular]}>
                        {currentSubscription ? 'Upgrade' : 'Subscribe'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderBundleCard = (bundle) => (
        <TouchableOpacity
            key={bundle.id}
            style={styles.bundleCard}
            onPress={() => handleBuyBundle(bundle)}
            activeOpacity={0.7}
        >
            <View style={styles.bundleIconWrap}>
                <Feather name="zap" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.bundleInfo}>
                <Text style={styles.bundleName}>{bundle.name || `${bundle.credits} Credits`}</Text>
                <Text style={styles.bundleCredits}>{bundle.credits} credits</Text>
            </View>
            <View style={styles.bundlePriceWrap}>
                <Text style={styles.bundlePrice}>{formatPrice(bundle.price)}</Text>
                {bundle.bonus_credits > 0 && (
                    <Text style={styles.bundleBonus}>+{bundle.bonus_credits} bonus</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Subscriptions</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'plans' && styles.tabActive]}
                    onPress={() => setActiveTab('plans')}
                >
                    <Feather name="star" size={16} color={activeTab === 'plans' ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'plans' && styles.tabTextActive]}>Plans</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'credits' && styles.tabActive]}
                    onPress={() => setActiveTab('credits')}
                >
                    <Feather name="zap" size={16} color={activeTab === 'credits' ? COLORS.primary : COLORS.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'credits' && styles.tabTextActive]}>Credit Bundles</Text>
                </TouchableOpacity>
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
                    {renderCurrentPlan()}

                    {activeTab === 'plans' ? (
                        <>
                            {plans.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Feather name="star" size={36} color={COLORS.textLight} />
                                    <Text style={styles.emptyText}>No plans available</Text>
                                </View>
                            ) : (
                                plans.map(renderPlanCard)
                            )}
                        </>
                    ) : (
                        <>
                            {bundles.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <Feather name="zap" size={36} color={COLORS.textLight} />
                                    <Text style={styles.emptyText}>No credit bundles available</Text>
                                </View>
                            ) : (
                                bundles.map(renderBundleCard)
                            )}
                        </>
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
    tabRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: 16,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primary,
        fontFamily: 'DMSans_600SemiBold',
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    currentPlanCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    currentPlanGradient: {
        padding: 20,
    },
    currentPlanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    currentPlanLabel: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: 'rgba(255,255,255,0.8)',
    },
    currentPlanName: {
        fontSize: 22,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
        marginTop: 2,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    activeBadgeText: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: '#FFFFFF',
    },
    daysRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    daysText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: 'rgba(255,255,255,0.9)',
    },
    expiringBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 8,
        padding: 10,
        marginTop: 12,
        gap: 6,
    },
    expiringText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: '#FFFFFF',
    },
    planCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 20,
        marginBottom: 14,
    },
    planCardPopular: {
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    popularBadge: {
        position: 'absolute',
        top: -1,
        right: 16,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    popularText: {
        fontSize: 11,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
    planName: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    planPrice: {
        fontSize: 28,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    planDuration: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginBottom: 16,
    },
    featuresList: { gap: 8, marginBottom: 16 },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    selectBtn: {
        paddingVertical: 14,
        borderRadius: 30,
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
    },
    selectBtnPopular: {
        backgroundColor: COLORS.primary,
    },
    selectBtnText: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
    selectBtnTextPopular: {
        color: '#FFFFFF',
    },
    bundleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 10,
    },
    bundleIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bundleInfo: { flex: 1 },
    bundleName: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    bundleCredits: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    bundlePriceWrap: { alignItems: 'flex-end' },
    bundlePrice: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    bundleBonus: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.success,
        marginTop: 2,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
});

export default SubscriptionScreen;
