import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../context/ToastContext';
import { getAgentById } from '../../lib/agentService';
import { getAgentRatingSummary, getAgentRatings } from '../../lib/ratingService';

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
    starFilled: '#F59E0B',
};

const AgentProfileViewScreen = ({ navigation, route }) => {
    const { agentId } = route.params;
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [agent, setAgent] = useState(null);
    const [ratingSummary, setRatingSummary] = useState(null);
    const [recentReviews, setRecentReviews] = useState([]);

    useEffect(() => {
        loadAgentProfile();
    }, [agentId]);

    const loadAgentProfile = async () => {
        try {
            const [agentResult, summaryResult, reviewsResult] = await Promise.all([
                getAgentById(agentId),
                getAgentRatingSummary(agentId),
                getAgentRatings(agentId, 0, 3),
            ]);

            if (agentResult.success) setAgent(agentResult.data);
            if (summaryResult.success) setRatingSummary(summaryResult.data);
            if (reviewsResult.success) setRecentReviews(reviewsResult.data);
        } catch (error) {
            toast.error('Failed to load agent profile');
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating, size = 14) => {
        const stars = [];
        const rounded = Math.round(rating || 0);
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Feather
                    key={i}
                    name="star"
                    size={size}
                    color={i <= rounded ? COLORS.starFilled : COLORS.border}
                />
            );
        }
        return <View style={styles.starsRow}>{stars}</View>;
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Agent Profile</Text>
                    <View style={{ width: 32 }} />
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </View>
        );
    }

    if (!agent) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Agent Profile</Text>
                    <View style={{ width: 32 }} />
                </View>
                <View style={styles.centerContainer}>
                    <Feather name="user-x" size={40} color={COLORS.textLight} />
                    <Text style={styles.errorText}>Agent not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Agent Profile</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarLarge}>
                        {agent.avatar ? (
                            <Image source={{ uri: agent.avatar }} style={styles.avatarLargeImg} />
                        ) : (
                            <Feather name="user" size={32} color={COLORS.primary} />
                        )}
                    </View>
                    <Text style={styles.profileName}>{agent.name}</Text>
                    {agent.agency_name ? (
                        <Text style={styles.agencyName}>{agent.agency_name}</Text>
                    ) : null}
                    {agent.city ? (
                        <View style={styles.locationBadge}>
                            <Feather name="map-pin" size={13} color={COLORS.textSecondary} />
                            <Text style={styles.locationBadgeText}>{agent.city}</Text>
                        </View>
                    ) : null}

                    {agent.verification_status === 'verified' && (
                        <View style={styles.verifiedBadge}>
                            <Feather name="check-circle" size={14} color={COLORS.success} />
                            <Text style={styles.verifiedText}>Verified Agent</Text>
                        </View>
                    )}

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNum}>{ratingSummary?.average?.toFixed(1) || '—'}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNum}>{ratingSummary?.count || 0}</Text>
                            <Text style={styles.statLabel}>Reviews</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNum}>{agent.experience || '—'}</Text>
                            <Text style={styles.statLabel}>Experience</Text>
                        </View>
                    </View>
                </View>

                {/* Bio */}
                {agent.bio && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Text style={styles.bioText}>{agent.bio}</Text>
                    </View>
                )}

                {/* Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.detailCard}>
                        {agent.city && (
                            <View style={styles.detailRow}>
                                <Feather name="map-pin" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.detailText}>{agent.city}</Text>
                            </View>
                        )}
                        <View style={styles.detailRow}>
                            <Feather name="calendar" size={16} color={COLORS.textSecondary} />
                            <Text style={styles.detailText}>
                                Member since {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Reviews */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Reviews</Text>
                        {(ratingSummary?.count || 0) > 0 && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('AgentRatings', { agentId: agent.id })}
                            >
                                <Text style={styles.seeAllText}>See all</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {recentReviews.length === 0 ? (
                        <Text style={styles.noReviews}>No reviews yet</Text>
                    ) : (
                        recentReviews.map((review) => (
                            <View key={review.id} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <View style={styles.reviewAvatar}>
                                        <Feather name="user" size={14} color={COLORS.primary} />
                                    </View>
                                    <Text style={styles.reviewerName}>{review.tenant?.name || 'Tenant'}</Text>
                                    {renderStars(review.rating, 12)}
                                </View>
                                {review.review ? (
                                    <Text style={styles.reviewText} numberOfLines={3}>{review.review}</Text>
                                ) : null}
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: 30 }} />
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
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    errorText: {
        fontSize: 15,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    profileCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        overflow: 'hidden',
    },
    avatarLargeImg: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    profileName: {
        fontSize: 22,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    agencyName: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.primary,
        marginBottom: 6,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 10,
    },
    locationBadgeText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 3,
    },
    verifiedText: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.success,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNum: {
        fontSize: 20,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
    },
    section: { marginBottom: 20 },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 12,
    },
    seeAllText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.primary,
    },
    bioText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    detailCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    noReviews: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingVertical: 20,
    },
    reviewCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 8,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    reviewerName: {
        fontSize: 13,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        flex: 1,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginTop: 10,
    },
});

export default AgentProfileViewScreen;
