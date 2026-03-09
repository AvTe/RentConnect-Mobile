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
    getAgentRatings,
    getAgentRatingSummary,
} from '../../lib/ratingService';
import { COLORS, FONTS } from '../../constants/theme';

const AgentRatingsScreen = ({ navigation, route }) => {
    const { agentId: paramAgentId } = route.params || {};
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();
    const agentId = paramAgentId || user?.id;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [ratings, setRatings] = useState([]);
    const [summary, setSummary] = useState(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const loadData = useCallback(async (reset = false) => {
        try {
            const currentPage = reset ? 0 : page;

            const [ratingsResult, summaryResult] = await Promise.all([
                getAgentRatings(agentId, currentPage),
                reset || !summary ? getAgentRatingSummary(agentId) : Promise.resolve({ success: true, data: summary }),
            ]);

            if (ratingsResult.success) {
                if (reset) {
                    setRatings(ratingsResult.data);
                } else {
                    setRatings(prev => [...prev, ...ratingsResult.data]);
                }
                setHasMore(ratingsResult.hasMore);
                if (reset) setPage(0);
            }

            if (summaryResult.success) {
                setSummary(summaryResult.data);
            }
        } catch (error) {
            toast.error('Failed to load ratings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [agentId, page, summary]);

    useEffect(() => {
        loadData(true);
    }, [agentId]);

    // Refresh data when screen comes back into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData(true);
        });
        return unsubscribe;
    }, [navigation, loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData(true);
    };

    const loadMore = () => {
        if (hasMore) {
            setPage(prev => prev + 1);
            loadData(false);
        }
    };

    const renderStars = (rating, size = 16) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Feather
                    key={i}
                    name="star"
                    size={size}
                    color={i <= Math.floor(rating) ? COLORS.starFilled : COLORS.starEmpty}
                />
            );
        }
        return <View style={styles.starsRow}>{stars}</View>;
    };

    const renderDistribution = () => {
        if (!summary) return null;
        const maxCount = Math.max(...Object.values(summary.distribution), 1);

        return (
            <View style={styles.distributionWrap}>
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[star] || 0;
                    const pct = (count / maxCount) * 100;
                    return (
                        <View key={star} style={styles.distRow}>
                            <Text style={styles.distLabel}>{star}</Text>
                            <Feather name="star" size={12} color={COLORS.starFilled} />
                            <View style={styles.distBarBg}>
                                <View style={[styles.distBarFill, { width: `${pct}%` }]} />
                            </View>
                            <Text style={styles.distCount}>{count}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ratings & Reviews</Text>
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
                    {/* Summary Card */}
                    {summary && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryLeft}>
                                <Text style={styles.avgRating}>
                                    {summary.average.toFixed(1)}
                                </Text>
                                {renderStars(summary.average, 20)}
                                <Text style={styles.totalReviews}>
                                    {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
                                </Text>
                            </View>
                            <View style={styles.summaryRight}>
                                {renderDistribution()}
                            </View>
                        </View>
                    )}

                    {/* Reviews */}
                    {ratings.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Feather name="star" size={36} color={COLORS.textLight} />
                            </View>
                            <Text style={styles.emptyTitle}>No reviews yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Reviews will appear here once tenants rate this agent
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.sectionTitle}>Reviews</Text>
                            {ratings.map((rating) => (
                                <View key={rating.id} style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <View style={styles.reviewAvatar}>
                                            <Feather name="user" size={16} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.reviewInfo}>
                                            <Text style={styles.reviewName}>
                                                {rating.tenant?.name || 'Tenant'}
                                            </Text>
                                            <Text style={styles.reviewDate}>
                                                {formatDate(rating.created_at)}
                                            </Text>
                                        </View>
                                        {renderStars(rating.rating, 14)}
                                    </View>
                                    {rating.review ? (
                                        <Text style={styles.reviewText}>{rating.review}</Text>
                                    ) : null}
                                </View>
                            ))}

                            {hasMore && (
                                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                                    <Text style={styles.loadMoreText}>Load More</Text>
                                </TouchableOpacity>
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 20,
        marginBottom: 20,
    },
    summaryLeft: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 20,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
    },
    avgRating: {
        fontSize: 40,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 2,
        marginVertical: 6,
    },
    totalReviews: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    summaryRight: {
        flex: 1,
        paddingLeft: 16,
        justifyContent: 'center',
    },
    distributionWrap: { gap: 4 },
    distRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    distLabel: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        width: 14,
        textAlign: 'center',
    },
    distBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    distBarFill: {
        height: '100%',
        backgroundColor: COLORS.starFilled,
        borderRadius: 3,
    },
    distCount: {
        fontSize: 11,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
        width: 20,
        textAlign: 'right',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 14,
    },
    reviewCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 10,
    },
    reviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    reviewInfo: { flex: 1 },
    reviewName: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    reviewDate: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
    },
    reviewText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 21,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    loadMoreBtn: {
        alignSelf: 'center',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 30,
        backgroundColor: COLORS.primaryLight,
        marginTop: 8,
    },
    loadMoreText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
});

export default AgentRatingsScreen;
