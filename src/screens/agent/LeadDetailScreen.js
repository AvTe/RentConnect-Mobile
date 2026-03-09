import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Share,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as ExpoLinking from 'expo-linking';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    calculateUnlockCost,
    calculateExclusiveCost,
    getLeadState,
    unlockLead,
    getLead,
    hasAgentUnlockedLead,
    incrementLeadViews,
    LEAD_STATE_STYLES,
} from '../../lib/leadService';
import { checkAgentLeadConnection, updateLeadOutcome, recordLeadContact } from '../../lib/leadConnectionService';
import { getWalletBalance, subscribeToWalletChanges } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { COLORS, FONTS } from '../../constants/theme';

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
    const [connectionId, setConnectionId] = useState(null);
    const [leadOutcome, setLeadOutcome] = useState(null);
    const [updatingOutcome, setUpdatingOutcome] = useState(false);
    const [sharing, setSharing] = useState(false);
    const shareCardRef = useRef(null);

    const fetchLeadDetails = useCallback(async () => {
        if (!leadId || !user?.id) {
            setLoading(false);
            return;
        }

        try {
            // Fetch lead details via service layer
            const leadResult = await getLead(leadId);

            if (!leadResult.success) throw new Error(leadResult.error);

            setLead(leadResult.data);

            // Check if unlocked via service layer
            const unlocked = await hasAgentUnlockedLead(user.id, leadId);
            setIsUnlocked(!!unlocked);

            // Fetch connection details for outcome tracking
            if (unlocked) {
                try {
                    const connResult = await checkAgentLeadConnection(leadId, user.id);
                    if (connResult.success && connResult.connected) {
                        // Try to get connection row ID for outcome tracking
                        const { data: connData } = await supabase
                            .from('lead_agent_connections')
                            .select('id, status, outcome')
                            .eq('lead_id', leadId)
                            .eq('agent_id', user.id)
                            .maybeSingle();
                        if (connData) {
                            setConnectionId(connData.id);
                            setLeadOutcome(connData.outcome || connData.status);
                        }
                    }
                } catch (e) {
                    // Non-critical — outcome tracking is optional
                    console.log('Could not fetch connection for outcome tracking:', e);
                }
            }

            // Fetch credit balance
            const balanceResult = await getWalletBalance(user.id);
            if (balanceResult.success) {
                setCreditBalance(balanceResult.balance);
            }

            // Track lead view (once per agent per lead)
            incrementLeadViews(leadId, user.id);
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

    // Refresh data when screen comes back into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchLeadDetails();
        });
        return unsubscribe;
    }, [navigation, fetchLeadDetails]);

    // Real-time wallet balance subscription
    useEffect(() => {
        if (!user?.id) return;
        const unsubscribe = subscribeToWalletChanges(user.id, (newBalance) => {
            setCreditBalance(newBalance);
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user?.id]);

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

    const getLeadDeepLink = useCallback(() => {
        if (!lead?.id) return '';
        return `https://yoombaa.com/lead/${lead.id}`;
    }, [lead?.id]);

    const handleShare = async () => {
        if (!lead || sharing) return;
        setSharing(true);

        try {
            // Capture the hidden preview card as an image
            const uri = await shareCardRef.current.capture({
                format: 'png',
                quality: 1,
                result: 'tmpfile',
            });

            const leadLink = getLeadDeepLink();

            // Clean, minimal caption — lead details are already in the preview image.
            // Only include a short CTA and the clickable HTTPS link.
            const shareCaption = `\ud83c\udfe0 Tenant Lead on Yoombaa\n\nView lead details: ${leadLink}`;

            if (Platform.OS === 'ios') {
                // iOS: Share.share supports url (image) + message (caption) together
                await Share.share({
                    message: shareCaption,
                    url: uri,
                    title: 'Yoombaa Lead',
                });
            } else {
                // Android: Copy the clickable link to clipboard, share the image,
                // user can paste the link as caption in WhatsApp/Telegram.
                await Clipboard.setStringAsync(shareCaption);
                toast.info('Link copied! Paste as caption when sharing.');

                const isAvailable = await Sharing.isAvailableAsync();
                if (isAvailable) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'image/png',
                        dialogTitle: 'Share Lead',
                        UTI: 'public.png',
                    });
                } else {
                    // Fallback: share text with clickable link
                    await Share.share({
                        message: shareCaption,
                        title: 'Yoombaa Lead',
                    });
                }
            }
        } catch (error) {
            if (error?.message !== 'User did not share') {
                console.error('Share error:', error);
                toast.error('Failed to share lead');
            }
        } finally {
            setSharing(false);
        }
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
                <TouchableOpacity style={styles.shareButton} onPress={handleShare} disabled={sharing}>
                    {sharing ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Feather name="share-2" size={20} color={COLORS.text} />
                    )}
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

                {/* Lead Outcome Tracking — matches web */}
                {isUnlocked && connectionId && (
                    <View style={styles.outcomeCard}>
                        <Text style={styles.outcomeTitle}>Lead Outcome</Text>
                        <Text style={styles.outcomeDesc}>
                            Track what happened with this lead for your pipeline analytics.
                        </Text>
                        {leadOutcome === 'converted' || leadOutcome === 'lost' ? (
                            <View style={[styles.outcomeBadge, leadOutcome === 'converted' ? styles.outcomeBadgeConverted : styles.outcomeBadgeLost]}>
                                <Feather
                                    name={leadOutcome === 'converted' ? 'check-circle' : 'x-circle'}
                                    size={16}
                                    color={leadOutcome === 'converted' ? COLORS.success : COLORS.error}
                                />
                                <Text style={[styles.outcomeBadgeText, { color: leadOutcome === 'converted' ? COLORS.success : COLORS.error }]}>
                                    {leadOutcome === 'converted' ? 'Converted' : 'Lost'}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.outcomeActions}>
                                <TouchableOpacity
                                    style={styles.outcomeConvertedBtn}
                                    disabled={updatingOutcome}
                                    onPress={async () => {
                                        setUpdatingOutcome(true);
                                        const res = await updateLeadOutcome(connectionId, 'converted', '');
                                        setUpdatingOutcome(false);
                                        if (res.success) {
                                            setLeadOutcome('converted');
                                            toast.success('Lead marked as converted!');
                                        } else {
                                            toast.error('Failed to update outcome');
                                        }
                                    }}
                                >
                                    {updatingOutcome ? (
                                        <ActivityIndicator size="small" color={COLORS.success} />
                                    ) : (
                                        <>
                                            <Feather name="check-circle" size={16} color={COLORS.success} />
                                            <Text style={styles.outcomeConvertedText}>Converted</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.outcomeLostBtn}
                                    disabled={updatingOutcome}
                                    onPress={async () => {
                                        Alert.alert(
                                            'Mark as Lost',
                                            'Are you sure this lead did not convert?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                {
                                                    text: 'Confirm',
                                                    onPress: async () => {
                                                        setUpdatingOutcome(true);
                                                        const res = await updateLeadOutcome(connectionId, 'lost', '');
                                                        setUpdatingOutcome(false);
                                                        if (res.success) {
                                                            setLeadOutcome('lost');
                                                            toast.info('Lead marked as lost');
                                                        } else {
                                                            toast.error('Failed to update outcome');
                                                        }
                                                    },
                                                },
                                            ]
                                        );
                                    }}
                                >
                                    <Feather name="x-circle" size={16} color={COLORS.error} />
                                    <Text style={styles.outcomeLostText}>Lost</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Report Bad Lead */}
                {isUnlocked && (
                    <TouchableOpacity
                        style={styles.reportBadLeadBtn}
                        onPress={() => navigation.navigate('BadLeadReport', { leadId: lead.id, leadTitle: lead.name || lead.tenant_name })}
                    >
                        <Feather name="flag" size={16} color="#EF4444" />
                        <Text style={styles.reportBadLeadText}>Report Bad Lead</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Hidden Share Preview Card — captured by ViewShot */}
            <ViewShot
                ref={shareCardRef}
                options={{ format: 'png', quality: 1 }}
                style={styles.shareCardWrapper}
            >
                <View style={styles.shareCard}>
                    {/* Top accent bar */}
                    <View style={styles.shareCardAccent} />

                    {/* Header with branding */}
                    <View style={styles.shareCardHeader}>
                        <View style={styles.shareCardLogoCircle}>
                            <Text style={styles.shareCardLogoText}>Y</Text>
                        </View>
                        <View>
                            <Text style={styles.shareCardBrand}>YOOMBAA</Text>
                            <Text style={styles.shareCardSubbrand}>Tenant Lead</Text>
                        </View>
                    </View>

                    {/* Main content */}
                    <View style={styles.shareCardBody}>
                        <Text style={styles.shareCardLabel}>Looking for</Text>
                        <Text style={styles.shareCardPropertyType}>
                            {lead?.property_type || lead?.requirements?.property_type || 'Property'}
                        </Text>

                        <View style={styles.shareCardLocationRow}>
                            <View style={styles.shareCardLocationIcon}>
                                <Feather name="map-pin" size={14} color={COLORS.primary} />
                            </View>
                            <Text style={styles.shareCardLocation}>
                                {lead?.location || lead?.requirements?.location || 'Location TBD'}
                            </Text>
                        </View>
                    </View>

                    {/* Info pills */}
                    <View style={styles.shareCardPills}>
                        {(lead?.budget || lead?.requirements?.budget) ? (
                            <View style={styles.shareCardPill}>
                                <Feather name="dollar-sign" size={12} color={COLORS.primary} />
                                <Text style={styles.shareCardPillText}>
                                    KSh {Number(lead?.budget || lead?.requirements?.budget).toLocaleString()}
                                </Text>
                            </View>
                        ) : null}
                        {lead?.move_in_date ? (
                            <View style={styles.shareCardPill}>
                                <Feather name="calendar" size={12} color={COLORS.primary} />
                                <Text style={styles.shareCardPillText}>
                                    {formatDate(lead.move_in_date)}
                                </Text>
                            </View>
                        ) : null}
                        <View style={styles.shareCardPill}>
                            <Feather name="users" size={12} color={COLORS.primary} />
                            <Text style={styles.shareCardPillText}>
                                {lead?.claimed_slots || 0}/{lead?.max_slots || 3} Slots
                            </Text>
                        </View>
                    </View>

                    {/* Tenant name (first name only for privacy) */}
                    <View style={styles.shareCardTenantRow}>
                        <View style={styles.shareCardAvatar}>
                            <Text style={styles.shareCardAvatarText}>
                                {(lead?.tenant_name || 'T').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.shareCardTenantName}>
                            {(lead?.tenant_name || 'Tenant').split(' ')[0]}
                        </Text>
                        {lead?.phone_verified && (
                            <View style={styles.shareCardVerified}>
                                <Feather name="check-circle" size={10} color={COLORS.success} />
                                <Text style={styles.shareCardVerifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>

                    {/* Deep Link URL */}
                    <View style={styles.shareCardLinkRow}>
                        <Feather name="link" size={12} color={COLORS.primary} />
                        <Text style={styles.shareCardLinkText} numberOfLines={1}>
                            {`yoombaa.com/lead/${lead?.id?.substring(0, 8) || ''}...`}
                        </Text>
                    </View>

                    {/* Footer CTA */}
                    <View style={styles.shareCardFooter}>
                        <Text style={styles.shareCardCTA}>Open in Yoombaa App</Text>
                    </View>
                </View>
            </ViewShot>

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
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.bold,
        letterSpacing: 0.5,
    },
    leadId: {
        fontSize: 12,
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    propertyType: {
        fontSize: 24,
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.medium,
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
        fontFamily: FONTS.bold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    slotsBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    slotsBadgeText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    tenantInfo: {
        flex: 1,
        marginLeft: 12,
    },
    tenantName: {
        fontSize: 17,
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.medium,
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
        fontFamily: FONTS.medium,
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
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 8,
    },
    notesText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    reportBadLeadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
        backgroundColor: '#FEF2F2',
        gap: 8,
        marginBottom: 16,
    },
    reportBadLeadText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: '#EF4444',
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
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    disabledBar: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    disabledText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
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
        fontFamily: FONTS.bold,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    // Lead Outcome Tracking
    outcomeCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    outcomeTitle: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 4,
    },
    outcomeDesc: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    outcomeActions: {
        flexDirection: 'row',
        gap: 12,
    },
    outcomeConvertedBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        backgroundColor: COLORS.successLight,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    outcomeConvertedText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.success,
    },
    outcomeLostBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    outcomeLostText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.error,
    },
    outcomeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderRadius: 12,
    },
    outcomeBadgeConverted: {
        backgroundColor: COLORS.successLight,
    },
    outcomeBadgeLost: {
        backgroundColor: '#FEF2F2',
    },
    outcomeBadgeText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
    },
    // Share Preview Card (rendered off-screen, captured by ViewShot)
    shareCardWrapper: {
        position: 'absolute',
        left: -9999,
        top: -9999,
        width: 400,
    },
    shareCard: {
        width: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
    },
    shareCardAccent: {
        height: 6,
        backgroundColor: COLORS.primary,
    },
    shareCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 8,
        gap: 12,
    },
    shareCardLogoCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareCardLogoText: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
    },
    shareCardBrand: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        letterSpacing: 1.5,
    },
    shareCardSubbrand: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    shareCardBody: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
    },
    shareCardLabel: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    shareCardPropertyType: {
        fontSize: 26,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 10,
    },
    shareCardLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    shareCardLocationIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareCardLocation: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    shareCardPills: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 8,
    },
    shareCardPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    shareCardPillText: {
        fontSize: 12,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    shareCardTenantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 8,
    },
    shareCardAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    shareCardAvatarText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    shareCardTenantName: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    shareCardVerified: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    shareCardVerifiedText: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: COLORS.success,
    },
    shareCardLinkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 14,
        gap: 6,
    },
    shareCardLinkText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.primary,
        flex: 1,
    },
    shareCardFooter: {
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        alignItems: 'center',
    },
    shareCardCTA: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});

export default LeadDetailScreen;
