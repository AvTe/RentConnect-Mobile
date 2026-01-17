import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getWalletBalance, addCredits } from '../../lib/database';
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
    error: '#EF4444',
    blue: '#3B82F6',
    blueLight: '#DBEAFE',
    purple: '#8B5CF6',
};

// Credit bundle options
const CREDIT_BUNDLES = [
    { id: 1, credits: 10, price: 500, popular: false, savings: null },
    { id: 2, credits: 25, price: 1100, popular: true, savings: '12% OFF' },
    { id: 3, credits: 50, price: 2000, popular: false, savings: '20% OFF' },
    { id: 4, credits: 100, price: 3500, popular: false, savings: '30% OFF' },
];

// Subscription plans
const SUBSCRIPTION_PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: 'Forever',
        features: [
            'View lead previews',
            'Basic search filters',
            '5 credits on signup',
        ],
        current: true,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 1500,
        period: '/month',
        features: [
            '20 credits per month',
            'Priority lead access',
            'Advanced filters',
            'Lead notifications',
            'Analytics dashboard',
        ],
        current: false,
        recommended: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 5000,
        period: '/month',
        features: [
            '75 credits per month',
            'Exclusive lead access',
            'All Pro features',
            'Team management',
            'API access',
            'Dedicated support',
        ],
        current: false,
    },
];

const BuyCreditsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('credits'); // credits or subscription
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('pro');
    const [currentBalance, setCurrentBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadBalance();
    }, [user?.id]);

    const loadBalance = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            const result = await getWalletBalance(user.id);
            if (result.success) {
                setCurrentBalance(result.balance);
            }
        } catch (error) {
            console.error('Error loading balance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedBundle) {
            toast.error('Please select a credit bundle');
            return;
        }

        Alert.alert(
            'Confirm Purchase',
            `Buy ${selectedBundle.credits} credits for KSh ${selectedBundle.price.toLocaleString()}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Pay Now',
                    onPress: async () => {
                        setProcessing(true);
                        // Simulate payment processing
                        setTimeout(async () => {
                            // For demo, add credits directly
                            const result = await addCredits(
                                user.id,
                                selectedBundle.credits,
                                `Purchased ${selectedBundle.credits} credits`
                            );

                            setProcessing(false);

                            if (result.success) {
                                toast.success(`${selectedBundle.credits} credits added!`);
                                setCurrentBalance(prev => prev + selectedBundle.credits);
                                setSelectedBundle(null);
                            } else {
                                toast.error('Purchase failed. Please try again.');
                            }
                        }, 2000);
                    },
                },
            ]
        );
    };

    const handleSubscribe = async () => {
        if (!selectedPlan || selectedPlan === 'free') {
            toast.info('You are already on the Free plan');
            return;
        }

        const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);

        Alert.alert(
            'Confirm Subscription',
            `Subscribe to ${plan.name} for KSh ${plan.price.toLocaleString()}/month?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Subscribe',
                    onPress: () => {
                        toast.info('Subscription coming soon! Use credit bundles for now.');
                    },
                },
            ]
        );
    };

    const CreditBundle = ({ bundle }) => {
        const isSelected = selectedBundle?.id === bundle.id;

        return (
            <TouchableOpacity
                style={[
                    styles.bundleCard,
                    isSelected && styles.bundleCardSelected,
                    bundle.popular && styles.bundleCardPopular,
                ]}
                onPress={() => setSelectedBundle(bundle)}
                activeOpacity={0.8}
            >
                {bundle.popular && (
                    <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                )}
                {bundle.savings && (
                    <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>{bundle.savings}</Text>
                    </View>
                )}
                <View style={styles.bundleContent}>
                    <View style={styles.creditsCircle}>
                        <Feather name="zap" size={20} color={isSelected ? '#FFFFFF' : COLORS.primary} />
                    </View>
                    <Text style={[styles.bundleCredits, isSelected && styles.bundleCreditsSelected]}>
                        {bundle.credits}
                    </Text>
                    <Text style={[styles.bundleLabel, isSelected && styles.bundleLabelSelected]}>
                        Credits
                    </Text>
                    <Text style={[styles.bundlePrice, isSelected && styles.bundlePriceSelected]}>
                        KSh {bundle.price.toLocaleString()}
                    </Text>
                </View>
                {isSelected && (
                    <View style={styles.checkMark}>
                        <Feather name="check" size={14} color="#FFFFFF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const SubscriptionPlan = ({ plan }) => {
        const isSelected = selectedPlan === plan.id;
        const isCurrent = plan.current;

        return (
            <TouchableOpacity
                style={[
                    styles.planCard,
                    isSelected && styles.planCardSelected,
                    plan.recommended && styles.planCardRecommended,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
            >
                {plan.recommended && (
                    <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>RECOMMENDED</Text>
                    </View>
                )}
                <View style={styles.planHeader}>
                    <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                        {plan.name}
                    </Text>
                    {isCurrent && (
                        <View style={styles.currentBadge}>
                            <Text style={styles.currentText}>CURRENT</Text>
                        </View>
                    )}
                </View>
                <View style={styles.planPriceRow}>
                    <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                        {plan.price === 0 ? 'Free' : `KSh ${plan.price.toLocaleString()}`}
                    </Text>
                    {plan.price > 0 && (
                        <Text style={styles.planPeriod}>{plan.period}</Text>
                    )}
                </View>
                <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                            <Feather
                                name="check"
                                size={14}
                                color={isSelected ? COLORS.primary : COLORS.success}
                            />
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}
                </View>
            </TouchableOpacity>
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
                    <Feather name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Buy Credits</Text>
                <View style={styles.headerRight}>
                    <View style={styles.balanceBadge}>
                        <Feather name="zap" size={14} color={COLORS.primary} />
                        <Text style={styles.balanceText}>{currentBalance}</Text>
                    </View>
                </View>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'credits' && styles.tabActive]}
                    onPress={() => setActiveTab('credits')}
                >
                    <Text style={[styles.tabText, activeTab === 'credits' && styles.tabTextActive]}>
                        Credit Bundles
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'subscription' && styles.tabActive]}
                    onPress={() => setActiveTab('subscription')}
                >
                    <Text style={[styles.tabText, activeTab === 'subscription' && styles.tabTextActive]}>
                        Subscription
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'credits' ? (
                    <>
                        {/* Benefits */}
                        <View style={styles.benefitsCard}>
                            <View style={styles.benefitRow}>
                                <View style={styles.benefitIcon}>
                                    <Feather name="zap" size={16} color={COLORS.warning} />
                                </View>
                                <Text style={styles.benefitText}>
                                    Credits never expire
                                </Text>
                            </View>
                            <View style={styles.benefitRow}>
                                <View style={styles.benefitIcon}>
                                    <Feather name="shield" size={16} color={COLORS.success} />
                                </View>
                                <Text style={styles.benefitText}>
                                    Secure payment via M-Pesa
                                </Text>
                            </View>
                            <View style={styles.benefitRow}>
                                <View style={styles.benefitIcon}>
                                    <Feather name="refresh-cw" size={16} color={COLORS.blue} />
                                </View>
                                <Text style={styles.benefitText}>
                                    Instant credit delivery
                                </Text>
                            </View>
                        </View>

                        {/* Credit Bundles Grid */}
                        <Text style={styles.sectionTitle}>Select Bundle</Text>
                        <View style={styles.bundlesGrid}>
                            {CREDIT_BUNDLES.map((bundle) => (
                                <CreditBundle key={bundle.id} bundle={bundle} />
                            ))}
                        </View>

                        {/* How Credits Work */}
                        <View style={styles.infoCard}>
                            <Text style={styles.infoTitle}>How Credits Work</Text>
                            <View style={styles.infoRow}>
                                <View style={styles.infoStep}>
                                    <Text style={styles.infoStepNum}>1</Text>
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Find a Lead</Text>
                                    <Text style={styles.infoText}>Browse tenant leads in your area</Text>
                                </View>
                            </View>
                            <View style={styles.infoRow}>
                                <View style={styles.infoStep}>
                                    <Text style={styles.infoStepNum}>2</Text>
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Unlock Contact</Text>
                                    <Text style={styles.infoText}>Use credits to view tenant details</Text>
                                </View>
                            </View>
                            <View style={styles.infoRow}>
                                <View style={styles.infoStep}>
                                    <Text style={styles.infoStepNum}>3</Text>
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Connect & Close</Text>
                                    <Text style={styles.infoText}>Reach out and close the deal</Text>
                                </View>
                            </View>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Subscription Plans */}
                        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
                        {SUBSCRIPTION_PLANS.map((plan) => (
                            <SubscriptionPlan key={plan.id} plan={plan} />
                        ))}
                    </>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                {activeTab === 'credits' ? (
                    <TouchableOpacity
                        style={[
                            styles.purchaseButton,
                            !selectedBundle && styles.purchaseButtonDisabled,
                        ]}
                        onPress={handlePurchase}
                        disabled={!selectedBundle || processing}
                    >
                        {processing ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Feather name="credit-card" size={18} color="#FFFFFF" />
                                <Text style={styles.purchaseButtonText}>
                                    {selectedBundle
                                        ? `Pay KSh ${selectedBundle.price.toLocaleString()}`
                                        : 'Select a Bundle'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.purchaseButton,
                            selectedPlan === 'free' && styles.purchaseButtonDisabled,
                        ]}
                        onPress={handleSubscribe}
                        disabled={selectedPlan === 'free'}
                    >
                        <Feather name="check-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.purchaseButtonText}>
                            {selectedPlan === 'free' ? 'Already on Free' : 'Subscribe Now'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
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
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    balanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    balanceText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: COLORS.background,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Benefits
    benefitsCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    benefitIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    benefitText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 12,
    },
    // Bundles
    bundlesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 20,
    },
    bundleCard: {
        width: '50%',
        paddingHorizontal: 6,
        marginBottom: 12,
    },
    bundleContent: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    bundleCardSelected: {
        transform: [{ scale: 1.02 }],
    },
    bundleCardPopular: {},
    popularBadge: {
        position: 'absolute',
        top: 6,
        left: 14,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        zIndex: 1,
    },
    popularText: {
        fontSize: 9,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    savingsBadge: {
        position: 'absolute',
        top: 6,
        right: 14,
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        zIndex: 1,
    },
    savingsText: {
        fontSize: 9,
        fontFamily: FONTS.bold,
        color: COLORS.success,
        letterSpacing: 0.5,
    },
    creditsCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    bundleCredits: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    bundleCreditsSelected: {
        color: COLORS.primary,
    },
    bundleLabel: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    bundleLabelSelected: {
        color: COLORS.primary,
    },
    bundlePrice: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    bundlePriceSelected: {
        color: COLORS.primary,
    },
    checkMark: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Info Card
    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    infoStep: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoStepNum: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    // Plans
    planCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    planCardSelected: {
        borderColor: COLORS.primary,
    },
    planCardRecommended: {
        borderColor: COLORS.primary,
    },
    recommendedBadge: {
        position: 'absolute',
        top: -10,
        left: 16,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    recommendedText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    planName: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    planNameSelected: {
        color: COLORS.primary,
    },
    currentBadge: {
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    currentText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.success,
        letterSpacing: 0.5,
    },
    planPriceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    planPrice: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    planPriceSelected: {
        color: COLORS.primary,
    },
    planPeriod: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    planFeatures: {},
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    featureText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.text,
    },
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.card,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    purchaseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 54,
        backgroundColor: COLORS.primary,
        borderRadius: 14,
    },
    purchaseButtonDisabled: {
        backgroundColor: COLORS.border,
    },
    purchaseButtonText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
    },
});

export default BuyCreditsScreen;
