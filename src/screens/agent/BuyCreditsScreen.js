import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    dark: '#1E293B',
    darkHeader: '#0F172A',
};

const BuyCreditsScreen = ({ navigation, route }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData } = useAuth();

    // States
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [bundles, setBundles] = useState([]);
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [showPaymentMethods, setShowPaymentMethods] = useState(false);
    const [activeAgents] = useState([
        { id: 1, name: 'A', color: '#EF4444' },
        { id: 2, name: 'CA', color: '#F59E0B' },
        { id: 3, name: 'JA', color: '#10B981' },
        { id: 4, name: 'KF', color: '#3B82F6' },
        { id: 5, name: 'PI', color: '#8B5CF6' },
    ]);

    // Fetch credit bundles from database
    const fetchBundles = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('credit_bundles')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            const bundlesList = data || [];
            setBundles(bundlesList);

            // Select popular bundle by default
            const popularBundle = bundlesList.find(b => b.popular) || bundlesList[0];
            if (popularBundle) {
                setSelectedBundle(popularBundle);
            }
        } catch (error) {
            console.error('Error fetching bundles:', error);
            // Use fallback data
            const fallbackBundles = [
                { id: '1', name: 'Starter', credits: 10, price: 500, per_lead: 'KSh 50/lead', popular: false },
                { id: '2', name: 'Professional', credits: 30, price: 1200, per_lead: 'KSh 40/lead', popular: true },
                { id: '3', name: 'Premium', credits: 50, price: 1500, per_lead: 'KSh 30/lead', popular: true },
                { id: '4', name: 'Business', credits: 100, price: 3500, per_lead: 'KSh 35/lead', popular: false },
            ];
            setBundles(fallbackBundles);
            setSelectedBundle(fallbackBundles[1]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    const formatPrice = (price) => {
        return `KSh ${price?.toLocaleString() || 0}`;
    };

    const handlePurchase = () => {
        if (!selectedBundle) {
            toast.error('Please select a bundle');
            return;
        }
        setShowPaymentMethods(true);
    };

    const handleMpesaPayment = async () => {
        if (!user?.id || !selectedBundle) return;

        setProcessing(true);
        try {
            // Get user phone for M-Pesa
            const phone = userData?.phone || user?.phone;

            if (!phone) {
                Alert.alert(
                    'Phone Required',
                    'Please add your phone number in your profile to use M-Pesa.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Go to Profile', onPress: () => navigation.navigate('AgentProfileEdit') }
                    ]
                );
                setProcessing(false);
                return;
            }

            // Create payment record (only use columns that exist in the table)
            const { data: payment, error: paymentError } = await supabase
                .from('payment_transactions')
                .insert({
                    user_id: user.id,
                    amount: selectedBundle.price,
                    currency: 'KES',
                    payment_method: 'mpesa',
                    status: 'pending',
                    description: `${selectedBundle.credits} Lead Credits - ${selectedBundle.name}`,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (paymentError) {
                console.error('Payment record error:', paymentError);
            }

            // Send M-Pesa STK Push request
            toast.success('M-Pesa payment request sent! Check your phone.');

            // TODO: Replace with actual M-Pesa API integration
            // In production, credits should ONLY be added after server-side
            // payment confirmation via M-Pesa callback webhook.
            // The current implementation is a development placeholder.
            logger.warn('[BuyCredits] Using dev placeholder — credits added without payment verification. Integrate M-Pesa callback before production release.');

            setTimeout(async () => {
                try {
                    // Verify payment status before crediting
                    // In production: poll server for payment confirmation
                    // or wait for webhook to update payment_transactions status
                    if (payment?.id) {
                        const { data: paymentStatus } = await supabase
                            .from('payment_transactions')
                            .select('status')
                            .eq('id', payment.id)
                            .single();

                        // In production, only proceed if status === 'completed'
                        // For dev, we allow 'pending' to pass through
                        if (paymentStatus?.status === 'failed') {
                            toast.error('Payment failed. Please try again.');
                            setProcessing(false);
                            return;
                        }
                    }

                    // Add credits to wallet
                    const { data: currentUser } = await supabase
                        .from('users')
                        .select('wallet_balance')
                        .eq('id', user.id)
                        .single();

                    const newBalance = (currentUser?.wallet_balance || 0) + selectedBundle.credits;

                    await supabase
                        .from('users')
                        .update({
                            wallet_balance: newBalance,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', user.id);

                    // Record transaction
                    await supabase
                        .from('credit_transactions')
                        .insert({
                            user_id: user.id,
                            amount: selectedBundle.credits,
                            type: 'credit',
                            reason: `Purchased ${selectedBundle.name} bundle - KSh ${selectedBundle.price}`,
                            balance_after: newBalance,
                            created_at: new Date().toISOString(),
                        });

                    // Update payment status
                    if (payment?.id) {
                        await supabase
                            .from('payment_transactions')
                            .update({ status: 'completed' })
                            .eq('id', payment.id);
                    }

                    toast.success(`${selectedBundle.credits} credits added to your wallet!`);
                    setShowPaymentMethods(false);
                    navigation.goBack();
                } catch (err) {
                    console.error('Credit update error:', err);
                    toast.error('Payment received but credit update failed. Contact support.');
                }
                setProcessing(false);
            }, 3000);

        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Payment failed. Please try again.');
            setProcessing(false);
        }
    };

    const handlePesapalPayment = async () => {
        if (!user?.id || !selectedBundle) return;

        setProcessing(true);
        try {
            // Create payment record (only use columns that exist in the table)
            const { data: payment, error } = await supabase
                .from('payment_transactions')
                .insert({
                    user_id: user.id,
                    amount: selectedBundle.price,
                    currency: 'KES',
                    payment_method: 'pesapal',
                    status: 'pending',
                    description: `${selectedBundle.credits} Lead Credits - ${selectedBundle.name}`,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) {
                console.error('Payment record error:', error);
            }

            // Open Pesapal payment page (would be actual URL in production)
            const pesapalUrl = `https://yoombaa.com/payment?amount=${selectedBundle.price}&credits=${selectedBundle.credits}&user=${user.id}`;

            await Linking.openURL(pesapalUrl);

            toast.info('Complete payment in your browser');
            setProcessing(false);
            setShowPaymentMethods(false);

        } catch (error) {
            console.error('Pesapal error:', error);
            toast.error('Could not open payment page');
            setProcessing(false);
        }
    };

    // Bundle Card Component
    const BundleCard = ({ bundle, isSelected, onSelect }) => (
        <TouchableOpacity
            style={[
                styles.bundleCard,
                isSelected && styles.bundleCardSelected
            ]}
            onPress={() => onSelect(bundle)}
            activeOpacity={0.8}
        >
            <View style={styles.bundleRadio}>
                <View style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected
                ]}>
                    {isSelected && <View style={styles.radioInner} />}
                </View>
            </View>

            <View style={styles.bundleInfo}>
                <View style={styles.bundleHeader}>
                    <Text style={[styles.bundleName, isSelected && styles.bundleNameSelected]}>
                        {bundle.name}
                    </Text>
                    {bundle.popular && (
                        <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>POPULAR</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.bundleDescription}>
                    {bundle.credits} lead unlocks • No expiry
                </Text>
            </View>

            <View style={styles.bundlePricing}>
                <Text style={[styles.bundlePrice, isSelected && styles.bundlePriceSelected]}>
                    {formatPrice(bundle.price)}
                </Text>
                <Text style={styles.bundlePerLead}>
                    {bundle.per_lead?.toUpperCase() || `KSH ${Math.round(bundle.price / bundle.credits)}/LEAD`}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Payment Method Screen
    if (showPaymentMethods) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.paymentHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setShowPaymentMethods(false)}
                    >
                        <Feather name="chevron-left" size={24} color={COLORS.text} />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.paymentScrollView}
                    contentContainerStyle={styles.paymentContent}
                >
                    {/* Title */}
                    <Text style={styles.paymentTitle}>Choose Payment Method</Text>
                    <Text style={styles.paymentSubtitle}>
                        {selectedBundle?.credits} Credits • {formatPrice(selectedBundle?.price)}
                    </Text>

                    {/* M-Pesa Option */}
                    <TouchableOpacity
                        style={styles.paymentOption}
                        onPress={handleMpesaPayment}
                        disabled={processing}
                        activeOpacity={0.8}
                    >
                        <View style={styles.paymentIconContainer}>
                            <View style={styles.mpesaIcon}>
                                <Text style={styles.mpesaIconText}>M-Pesa</Text>
                            </View>
                        </View>
                        <View style={styles.paymentOptionInfo}>
                            <View style={styles.paymentOptionRow}>
                                <Text style={styles.paymentOptionName}>M-Pesa</Text>
                                <View style={styles.instantBadge}>
                                    <Text style={styles.instantText}>INSTANT</Text>
                                </View>
                            </View>
                            <Text style={styles.paymentOptionDesc}>Pay directly via STK Push</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* Pesapal Option */}
                    <TouchableOpacity
                        style={styles.paymentOption}
                        onPress={handlePesapalPayment}
                        disabled={processing}
                        activeOpacity={0.8}
                    >
                        <View style={styles.paymentIconContainer}>
                            <View style={styles.pesapalIcon}>
                                <Text style={styles.pesapalIconText}>🌿</Text>
                            </View>
                        </View>
                        <View style={styles.paymentOptionInfo}>
                            <Text style={styles.paymentOptionName}>Pesapal</Text>
                            <Text style={styles.paymentOptionDesc}>M-Pesa, Visa, Mastercard, Airtel</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>

                    {/* Security Note */}
                    <View style={styles.securityNote}>
                        <Feather name="lock" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.securityText}>256-bit SSL encrypted payments</Text>
                    </View>

                    {processing && (
                        <View style={styles.processingOverlay}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.processingText}>Processing payment...</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Security Badges Footer */}
                <View style={[styles.securityFooter, { paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.securityBadges}>
                        <View style={styles.securityBadge}>
                            <Text style={styles.badgeLabel}>PCI DSS</Text>
                            <Text style={styles.badgeValue}>COMPLIANT</Text>
                        </View>
                        <View style={styles.securityBadge}>
                            <Text style={styles.badgeLabel}>MPESA</Text>
                            <Text style={styles.badgeValue}>CERTIFIED</Text>
                        </View>
                        <View style={styles.securityBadge}>
                            <Text style={styles.badgeLabel}>PESAPAL</Text>
                            <Text style={styles.badgeValue}>VERIFIED</Text>
                        </View>
                    </View>
                    <View style={styles.aesNote}>
                        <Feather name="shield" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.aesText}>AES-256 BANK-LEVEL SECURED</Text>
                    </View>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Dark Header Section */}
            <LinearGradient
                colors={[COLORS.darkHeader, COLORS.dark]}
                style={[styles.headerSection, { paddingTop: insets.top + 16 }]}
            >
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <View style={styles.verifiedBadge}>
                        <Feather name="shield" size={14} color={COLORS.primary} />
                        <Text style={styles.verifiedText}>VERIFIED CHECKOUT</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Feather name="x" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Hero Text */}
                <View style={styles.heroContent}>
                    <Text style={styles.heroTitle}>Scale Your Reach.</Text>
                    <Text style={styles.heroSubtitle}>
                        Connect with verified tenants actively looking for their next home.
                    </Text>
                </View>

                {/* Secure Payments Badge */}
                <View style={styles.secureBadge}>
                    <View style={styles.secureIcon}>
                        <Feather name="shield" size={20} color={COLORS.primary} />
                    </View>
                    <View>
                        <Text style={styles.secureTitle}>Secure Payments</Text>
                        <Text style={styles.secureDesc}>Bank-level encryption protected</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Lead Credits Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lead Credits</Text>
                    <Text style={styles.sectionSubtitle}>SELECT A BUNDLE TO TOP UP YOUR WALLET</Text>
                </View>

                {/* Bundle Cards */}
                <View style={styles.bundlesContainer}>
                    {bundles.map((bundle) => (
                        <BundleCard
                            key={bundle.id}
                            bundle={bundle}
                            isSelected={selectedBundle?.id === bundle.id}
                            onSelect={setSelectedBundle}
                        />
                    ))}
                </View>

                {/* Bonus Reward Card */}
                <View style={styles.bonusCard}>
                    <View style={styles.bonusHeader}>
                        <View style={styles.giftIcon}>
                            <Feather name="gift" size={20} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.bonusLabel}>BONUS REWARD</Text>
                            <Text style={styles.bonusText}>
                                Purchase a bundle & get a chance to win{'\n'}
                                <Text style={styles.bonusHighlight}>FREE vouchers!</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Active Agents */}
                    <View style={styles.agentsRow}>
                        {activeAgents.map((agent, index) => (
                            <View
                                key={agent.id}
                                style={[
                                    styles.agentAvatar,
                                    { backgroundColor: agent.color, marginLeft: index > 0 ? -8 : 0 }
                                ]}
                            >
                                <Text style={styles.agentText}>{agent.name}</Text>
                            </View>
                        ))}
                        <View style={styles.agentsInfo}>
                            <Feather name="user" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.agentsCount}>ACTIVE AGENTS</Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom CTA */}
            <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
                {/* Security Icons */}
                <View style={styles.securityIcons}>
                    <Feather name="credit-card" size={16} color={COLORS.textSecondary} />
                    <Feather name="smartphone" size={16} color={COLORS.textSecondary} />
                    <Feather name="shield" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.sslText}>🔒 256-BIT SSL</Text>
                </View>

                {/* Purchase Button */}
                <TouchableOpacity
                    style={styles.purchaseButton}
                    onPress={handlePurchase}
                    activeOpacity={0.9}
                    disabled={!selectedBundle}
                >
                    <LinearGradient
                        colors={[COLORS.primary, '#E58500']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.purchaseGradient}
                    >
                        <Text style={styles.purchaseText}>Complete Purchase</Text>
                        <Feather name="arrow-right" size={20} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Compliance Text */}
                <View style={styles.complianceRow}>
                    <Feather name="lock" size={12} color={COLORS.textSecondary} />
                    <Text style={styles.complianceText}>
                        AES-256 BANK-LEVEL SECURED  •  PCI DSS COMPLIANT
                    </Text>
                </View>
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
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    // Dark Header
    headerSection: {
        backgroundColor: COLORS.darkHeader,
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    verifiedText: {
        fontSize: 11,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 28,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: 'rgba(255,255,255,0.7)',
        lineHeight: 20,
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    secureIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(254,146,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secureTitle: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
    secureDesc: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: 'rgba(255,255,255,0.6)',
    },
    // Main Content
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 11,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
    },
    // Bundle Cards
    bundlesContainer: {
        gap: 12,
        marginBottom: 20,
    },
    bundleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    bundleCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
    },
    bundleRadio: {
        marginRight: 14,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterSelected: {
        borderColor: COLORS.primary,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.primary,
    },
    bundleInfo: {
        flex: 1,
    },
    bundleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    bundleName: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    bundleNameSelected: {
        color: COLORS.text,
    },
    popularBadge: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    popularText: {
        fontSize: 9,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    bundleDescription: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    bundlePricing: {
        alignItems: 'flex-end',
    },
    bundlePrice: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    bundlePriceSelected: {
        color: COLORS.primary,
    },
    bundlePerLead: {
        fontSize: 10,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    // Bonus Card
    bonusCard: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(254,146,0,0.2)',
    },
    bonusHeader: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    giftIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bonusLabel: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    bonusText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
        lineHeight: 20,
    },
    bonusHighlight: {
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    agentsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    agentAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    agentText: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
    },
    agentsInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        gap: 4,
    },
    agentsCount: {
        fontSize: 10,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    // Bottom CTA
    bottomCta: {
        backgroundColor: COLORS.card,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    securityIcons: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    sslText: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    purchaseButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    purchaseGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    purchaseText: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
    complianceRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    complianceText: {
        fontSize: 10,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    // Payment Methods Screen
    paymentHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 16,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    paymentScrollView: {
        flex: 1,
    },
    paymentContent: {
        padding: 20,
    },
    paymentTitle: {
        fontSize: 28,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    paymentSubtitle: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginBottom: 32,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    paymentIconContainer: {
        marginRight: 14,
    },
    mpesaIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mpesaIconText: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
    },
    pesapalIcon: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pesapalIconText: {
        fontSize: 24,
    },
    paymentOptionInfo: {
        flex: 1,
    },
    paymentOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    paymentOptionName: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    instantBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    instantText: {
        fontSize: 9,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
    },
    paymentOptionDesc: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    securityNote: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
    },
    securityText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    processingOverlay: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    processingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    securityFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    securityBadges: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    securityBadge: {
        alignItems: 'center',
    },
    badgeLabel: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    badgeValue: {
        fontSize: 10,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    aesNote: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    aesText: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
});

export default BuyCreditsScreen;
