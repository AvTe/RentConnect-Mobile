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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';
import {
    calculateUnlockCost,
    calculateExclusiveCost,
    getLeadState,
    unlockLead,
    LEAD_STATE_STYLES,
} from '../../lib/leadService';
import { getWalletBalance } from '../../lib/database';

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
    blue: '#3B82F6',
    blueLight: '#DBEAFE',
};

const LeadDetailScreen = ({ route, navigation }) => {
    const { leadId } = route.params || {};
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [lead, setLead] = useState(null);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [creditBalance, setCreditBalance] = useState(0);
    const [unlocking, setUnlocking] = useState(false);

    const fetchLeadDetails = useCallback(async () => {
        if (!leadId || !user?.id) {
            setLoading(false);
            return;
        }

        try {
            // Fetch lead details
            const { data: leadData, error: leadError } = await supabase
                .from('leads')
                .select('*')
                .eq('id', leadId)
                .single();

            if (leadError) throw leadError;

            setLead(leadData);

            // Check if unlocked
            const { data: unlockedData } = await supabase
                .from('contact_history')
                .select('id')
                .eq('agent_id', user.id)
                .eq('lead_id', leadId)
                .in('contact_type', ['unlock', 'exclusive'])
                .single();

            setIsUnlocked(!!unlockedData);

            // Fetch credit balance
            const balanceResult = await getWalletBalance(user.id);
            if (balanceResult.success) {
                setCreditBalance(balanceResult.balance);
            }
        } catch (error) {
            console.error('Error fetching lead:', error);
            toast.error('Failed to load lead details');
        } finally {
            setLoading(false);
        }
    }, [leadId, user?.id]);

    useEffect(() => {
        fetchLeadDetails();
    }, [fetchLeadDetails]);

    const handleUnlock = async (isExclusive = false) => {
        if (!lead) return;

        const cost = isExclusive ? calculateExclusiveCost(lead) : calculateUnlockCost(lead);

        if (creditBalance < cost) {
            Alert.alert(
                'Insufficient Credits',
                `You need ${cost} credits but only have ${creditBalance}. Would you like to top up?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Top Up', onPress: () => navigation.navigate('BuyCredits') }
                ]
            );
            return;
        }

        Alert.alert(
            isExclusive ? 'Buy Exclusive Access' : 'Unlock Lead',
            `This will cost ${cost} credits. You'll get access to ${lead.tenant_name || 'tenant'}'s contact information.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setUnlocking(true);
                        const result = await unlockLead(user.id, lead.id, isExclusive);
                        setUnlocking(false);

                        if (result.success) {
                            toast.success('Lead unlocked successfully!');
                            setIsUnlocked(true);
                            setCreditBalance(prev => prev - cost);
                            fetchLeadDetails();
                        } else {
                            toast.error(result.error || 'Failed to unlock lead');
                        }
                    }
                }
            ]
        );
    };

    const handleCall = () => {
        if (lead?.tenant_phone) {
            Linking.openURL(`tel:${lead.tenant_phone}`);
        }
    };

    const handleWhatsApp = () => {
        const phone = lead?.tenant_phone || lead?.phone;
        if (phone) {
            Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatBudget = (budget) => {
        if (!budget) return 'TBD';
        return `KSh ${budget.toLocaleString()}`;
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading lead details...</Text>
            </View>
        );
    }

    if (!lead) {
        return (
            <View style={[styles.container, styles.errorContainer, { paddingTop: insets.top }]}>
                <Feather name="alert-circle" size={48} color={COLORS.error} />
                <Text style={styles.errorTitle}>Lead not found</Text>
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const state = getLeadState(lead, isUnlocked);
    const stateStyles = LEAD_STATE_STYLES[state];
    const unlockCost = calculateUnlockCost(lead);
    const exclusiveCost = calculateExclusiveCost(lead);
    const claimedSlots = lead.claimed_slots || 0;
    const maxSlots = lead.max_slots || 3;
    const canBuyExclusive = claimedSlots === 0 && !lead.is_exclusive && state === 'available';

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
                <Text style={styles.headerTitle}>Lead Details</Text>
                <TouchableOpacity style={styles.shareButton}>
                    <Feather name="share-2" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Badge */}
                <View style={styles.statusRow}>
                    <View style={[styles.statusBadge, { backgroundColor: stateStyles.slotBg }]}>
                        <Feather
                            name={isUnlocked ? 'unlock' : 'lock'}
                            size={14}
                            color={stateStyles.statusColor}
                        />
                        <Text style={[styles.statusText, { color: stateStyles.statusColor }]}>
                            {isUnlocked ? 'UNLOCKED' : stateStyles.statusText}
                        </Text>
                    </View>
                    <Text style={styles.leadId}>ID: {lead.id?.substring(0, 8)}...</Text>
                </View>

                {/* Main Info Card */}
                <View style={styles.mainCard}>
                    <Text style={styles.lookingFor}>Looking for</Text>
                    <Text style={styles.propertyType}>
                        {lead.property_type || lead.requirements?.property_type || 'Property'}
                    </Text>

                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={16} color={COLORS.primary} />
                        <Text style={styles.locationText}>
                            {lead.location || lead.requirements?.location || 'Location TBD'}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {/* Details Grid */}
                    <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>BUDGET</Text>
                            <Text style={styles.detailValue}>
                                {formatBudget(lead.budget || lead.requirements?.budget)}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>MOVE-IN DATE</Text>
                            <Text style={styles.detailValue}>
                                {formatDate(lead.move_in_date)}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>POSTED</Text>
                            <Text style={styles.detailValue}>
                                {formatDate(lead.created_at)}
                            </Text>
                        </View>
                        <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>EXPIRES</Text>
                            <Text style={styles.detailValue}>
                                {formatDate(lead.expires_at)}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Slots Card */}
                <View style={styles.slotsCard}>
                    <View style={styles.slotsHeader}>
                        <Text style={styles.slotsTitle}>Agent Slots</Text>
                        <View style={[styles.slotsBadge, { backgroundColor: stateStyles.slotBg }]}>
                            <Text style={[styles.slotsBadgeText, { color: stateStyles.slotColor }]}>
                                {claimedSlots}/{maxSlots} CLAIMED
                            </Text>
                        </View>
                    </View>
                    <View style={styles.slotsRow}>
                        {[1, 2, 3].map((slot) => (
                            <View
                                key={slot}
                                style={[
                                    styles.slotBox,
                                    slot <= claimedSlots ? styles.slotBoxFilled : styles.slotBoxEmpty,
                                ]}
                            >
                                <Feather
                                    name={slot <= claimedSlots ? 'check' : 'user'}
                                    size={16}
                                    color={slot <= claimedSlots ? '#FFFFFF' : COLORS.border}
                                />
                            </View>
                        ))}
                    </View>
                    <Text style={styles.slotsPricing}>
                        Slot 1: 250 credits • Slot 2: 375 credits • Slot 3: 625 credits
                    </Text>
                </View>

                {/* Tenant Info Card */}
                <View style={styles.tenantCard}>
                    <View style={styles.tenantHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(lead.tenant_name || 'T').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.tenantInfo}>
                            <Text style={styles.tenantName}>
                                {isUnlocked ? (lead.tenant_name || 'Tenant') : '••••••••'}
                            </Text>
                            <View style={styles.verifiedRow}>
                                {lead.phone_verified && (
                                    <View style={styles.verifiedBadge}>
                                        <Feather name="check-circle" size={12} color={COLORS.success} />
                                        <Text style={styles.verifiedText}>Verified</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {isUnlocked ? (
                        <View style={styles.contactInfo}>
                            <View style={styles.contactRow}>
                                <Feather name="phone" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.contactText}>
                                    {lead.tenant_phone || lead.phone || 'Phone not available'}
                                </Text>
                            </View>
                            {lead.tenant_email && (
                                <View style={styles.contactRow}>
                                    <Feather name="mail" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.contactText}>{lead.tenant_email}</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.lockedInfo}>
                            <Feather name="lock" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.lockedText}>
                                Unlock this lead to view contact information
                            </Text>
                        </View>
                    )}
                </View>

                {/* Requirements Card */}
                {lead.requirements?.notes && (
                    <View style={styles.notesCard}>
                        <Text style={styles.notesTitle}>Additional Notes</Text>
                        <Text style={styles.notesText}>{lead.requirements.notes}</Text>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
                {isUnlocked ? (
                    <View style={styles.contactActions}>
                        <TouchableOpacity
                            style={styles.callButton}
                            onPress={handleCall}
                        >
                            <Feather name="phone" size={18} color={COLORS.text} />
                            <Text style={styles.callButtonText}>Call</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.whatsappButton}
                            onPress={handleWhatsApp}
                        >
                            <Feather name="message-circle" size={18} color="#FFFFFF" />
                            <Text style={styles.whatsappButtonText}>WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                ) : state === 'expired' || state === 'sold_out' ? (
                    <View style={styles.disabledBar}>
                        <Text style={styles.disabledText}>
                            This lead is no longer available
                        </Text>
                    </View>
                ) : (
                    <View style={styles.unlockActions}>
                        <TouchableOpacity
                            style={styles.unlockButton}
                            onPress={() => handleUnlock(false)}
                            disabled={unlocking}
                        >
                            {unlocking ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Feather name="zap" size={18} color="#FFFFFF" />
                                    <Text style={styles.unlockButtonText}>
                                        Unlock • {unlockCost} Credits
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {canBuyExclusive && (
                            <TouchableOpacity
                                style={styles.exclusiveButton}
                                onPress={() => handleUnlock(true)}
                                disabled={unlocking}
                            >
                                <Feather name="award" size={16} color={COLORS.primary} />
                                <Text style={styles.exclusiveButtonText}>
                                    Exclusive • {exclusiveCost}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
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
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginTop: 16,
    },
    backBtn: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
    backBtnText: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
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
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    shareButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Status Row
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statusText: {
        fontSize: 11,
        fontFamily: 'DMSans_700Bold',
        letterSpacing: 0.5,
    },
    leadId: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    // Main Card
    mainCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    lookingFor: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    propertyType: {
        fontSize: 24,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        fontSize: 15,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 16,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    detailItem: {
        width: '50%',
        marginBottom: 16,
    },
    detailLabel: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    // Slots Card
    slotsCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    slotsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    slotsTitle: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    slotsBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    slotsBadgeText: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
        letterSpacing: 0.5,
    },
    slotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 12,
    },
    slotBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    slotBoxFilled: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    slotBoxEmpty: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
    },
    slotsPricing: {
        fontSize: 11,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    // Tenant Card
    tenantCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tenantHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 20,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    tenantInfo: {
        flex: 1,
        marginLeft: 12,
    },
    tenantName: {
        fontSize: 17,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    verifiedRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    verifiedText: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.success,
    },
    contactInfo: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 14,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    contactText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.text,
    },
    lockedInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },
    lockedText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    // Notes Card
    notesCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    notesTitle: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 8,
    },
    notesText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        lineHeight: 20,
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
    contactActions: {
        flexDirection: 'row',
        gap: 12,
    },
    callButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        backgroundColor: COLORS.card,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 12,
    },
    callButtonText: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    whatsappButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        backgroundColor: '#25D366',
        borderRadius: 12,
    },
    whatsappButtonText: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
    disabledBar: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    disabledText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    unlockActions: {
        flexDirection: 'row',
        gap: 12,
    },
    unlockButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    unlockButtonText: {
        fontSize: 15,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
    },
    exclusiveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 16,
        height: 50,
        backgroundColor: COLORS.primaryLight,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 12,
    },
    exclusiveButtonText: {
        fontSize: 13,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.primary,
    },
});

export default LeadDetailScreen;
