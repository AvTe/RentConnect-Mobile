import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ImageBackground,
    RefreshControl,
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    primaryDark: '#E58300',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    purple: '#8B5CF6',
    amber: '#D97706',
};

const STATUS_COLORS = {
    active: { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
    paused: { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
    expired: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
    sold_out: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
};

const TenantDashboardScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ active: 0, views: 0, replies: 0 });
    const [recentRequests, setRecentRequests] = useState([]);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim1 = useRef(new Animated.Value(0.8)).current;
    const scaleAnim2 = useRef(new Animated.Value(0.8)).current;
    const scaleAnim3 = useRef(new Animated.Value(0.8)).current;

    // Carousel state
    const [currentSlide, setCurrentSlide] = useState(0);
    const carouselRef = useRef(null);
    const BANNER_WIDTH = width - 40;

    // Promo slides data
    const promoSlides = [
        {
            id: 1,
            tag: '🏠 FEATURED',
            title: 'Find Your Dream Home',
            subtitle: 'Explore premium listings in Nairobi,\nMombasa, Kisumu & more',
            gradient: ['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.3)', 'rgba(254,146,0,0.4)'],
        },
        {
            id: 2,
            tag: '🔥 HOT DEALS',
            title: 'Special Offers This Month',
            subtitle: 'Get up to 50% off on first month\nrent in selected properties',
            gradient: ['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.3)', 'rgba(139,92,246,0.4)'],
        },
        {
            id: 3,
            tag: '✨ NEW',
            title: 'Premium Apartments',
            subtitle: 'Luxury living spaces now available\nin Westlands & Kilimani',
            gradient: ['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.3)', 'rgba(16,185,129,0.4)'],
        },
    ];

    const fetchData = useCallback(async () => {
        try {
            const { data: leads, error } = await supabase
                .from('leads')
                .select('*')
                .eq('tenant_email', user?.email)
                .order('created_at', { ascending: false })
                .limit(3);

            if (leads) {
                setRecentRequests(leads);
                const activeCount = leads.filter(l => l.status === 'active').length;
                const totalViews = leads.reduce((sum, l) => sum + (l.views || 0), 0);
                setStats({
                    active: activeCount,
                    views: totalViews,
                    replies: 0,
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Auto-scroll carousel
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => {
                const nextSlide = (prev + 1) % promoSlides.length;
                carouselRef.current?.scrollToIndex({ index: nextSlide, animated: true });
                return nextSlide;
            });
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Animate stats cards on load
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim1, {
                toValue: 1,
                friction: 6,
                tension: 80,
                delay: 100,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim2, {
                toValue: 1,
                friction: 6,
                tension: 80,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim3, {
                toValue: 1,
                friction: 6,
                tension: 80,
                delay: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [loading]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getUserName = () => {
        if (userProfile?.name) return userProfile.name.split(' ')[0];
        if (user?.email) return user.email.split('@')[0];
        return 'there';
    };

    const getStatusStyle = (status) => {
        return STATUS_COLORS[status] || STATUS_COLORS.expired;
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
            {/* Clean Header - Logo Only */}
            <View style={styles.header}>
                <Image
                    source={require('../../../assets/yoombaa logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Feather name="bell" size={22} color={COLORS.text} />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryDark]}
                            style={styles.profileGradient}
                        >
                            <Feather name="user" size={18} color="#FFFFFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {/* Promotional Carousel Banner */}
                <View style={styles.carouselContainer}>
                    <FlatList
                        ref={carouselRef}
                        data={promoSlides}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item.id.toString()}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
                            setCurrentSlide(index);
                        }}
                        getItemLayout={(data, index) => ({
                            length: BANNER_WIDTH,
                            offset: BANNER_WIDTH * index,
                            index,
                        })}
                        renderItem={({ item }) => (
                            <View style={[styles.bannerSlide, { width: BANNER_WIDTH }]}>
                                <ImageBackground
                                    source={require('../../../assets/hero section img.jpg')}
                                    style={styles.bannerBackground}
                                    imageStyle={styles.bannerImage}
                                >
                                    <LinearGradient
                                        colors={item.gradient}
                                        style={styles.bannerGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                    >
                                        <View style={styles.promoTag}>
                                            <Text style={styles.promoTagText}>{item.tag}</Text>
                                        </View>
                                        <Text style={styles.bannerTitle}>{item.title}</Text>
                                        <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
                                    </LinearGradient>
                                </ImageBackground>
                            </View>
                        )}
                    />
                    {/* Dots Indicator */}
                    <View style={styles.dotsContainer}>
                        {promoSlides.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentSlide === index && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Stats Cards - Improved */}
                <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
                    <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim1 }] }]}>
                        <View style={[styles.statIconWrapper, { backgroundColor: COLORS.primaryLight }]}>
                            <Feather name="home" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statValue}>{stats.active}</Text>
                        <Text style={styles.statLabel}>ACTIVE</Text>
                        <View style={styles.statMeta}>
                            <Feather name="zap" size={10} color={COLORS.primary} />
                            <Text style={styles.statMetaText}>JUST NOW</Text>
                        </View>
                    </Animated.View>

                    <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim2 }] }]}>
                        <View style={[styles.statIconWrapper, { backgroundColor: '#EDE9FE' }]}>
                            <Feather name="eye" size={18} color={COLORS.purple} />
                        </View>
                        <Text style={styles.statValue}>{stats.views}</Text>
                        <Text style={styles.statLabel}>VIEWS</Text>
                        <View style={styles.statMeta}>
                            <Feather name="trending-up" size={10} color={COLORS.purple} />
                            <Text style={[styles.statMetaText, { color: COLORS.purple }]}>+12 THIS WEEK</Text>
                        </View>
                    </Animated.View>

                    <Animated.View style={[styles.statCard, { transform: [{ scale: scaleAnim3 }] }]}>
                        <View style={[styles.statIconWrapper, { backgroundColor: '#FEF3C7' }]}>
                            <Feather name="mail" size={18} color={COLORS.amber} />
                        </View>
                        <Text style={styles.statValue}>{stats.replies}</Text>
                        <Text style={styles.statLabel}>REPLIES</Text>
                        <View style={styles.statMeta}>
                            <Feather name="clock" size={10} color={COLORS.amber} />
                            <Text style={[styles.statMetaText, { color: COLORS.amber }]}>3 PENDING</Text>
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* My Requests Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Requests</Text>
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => navigation.navigate('Requests')}
                    >
                        <Text style={styles.viewAllText}>View All</Text>
                        <Feather name="chevron-right" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {recentRequests.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIconWrapper}>
                            <Feather name="inbox" size={32} color={COLORS.textSecondary} />
                        </View>
                        <Text style={styles.emptyText}>No requests yet</Text>
                        <Text style={styles.emptySubtext}>Post your first rental request!</Text>
                    </View>
                ) : (
                    recentRequests.map((request, index) => (
                        <TouchableOpacity
                            key={request.id}
                            style={styles.requestCard}
                            onPress={() => navigation.navigate('RequestDetail', { requestId: request.id })}
                            activeOpacity={0.9}
                        >
                            {/* Card Header */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(request.status).bg }]}>
                                    <Text style={[styles.statusText, { color: getStatusStyle(request.status).text }]}>
                                        {request.status?.toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.postedDateWrapper}>
                                    <Feather name="calendar" size={12} color={COLORS.textLight} />
                                    <Text style={styles.postedDate}>
                                        Posted {new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                    </Text>
                                </View>
                            </View>

                            {/* Card Content */}
                            <View style={styles.cardContent}>
                                <View style={styles.cardMain}>
                                    <Text style={styles.requestTitle} numberOfLines={1}>
                                        {request.property_type || 'Property'} In {request.location}
                                    </Text>
                                    <View style={styles.locationRow}>
                                        <Feather name="map-pin" size={13} color={COLORS.primary} />
                                        <Text style={styles.locationText}>{request.location}</Text>
                                    </View>
                                </View>
                                <View style={styles.budgetSection}>
                                    <Text style={styles.budgetLabel}>BUDGET</Text>
                                    <Text style={styles.budgetCurrency}>KSh</Text>
                                    <Text style={styles.budgetAmount}>{parseInt(request.budget || 0).toLocaleString()}</Text>
                                    <Text style={styles.budgetPeriod}>/mo</Text>
                                </View>
                            </View>

                            {/* Card Footer */}
                            <View style={styles.cardFooter}>
                                <View style={styles.metricsRow}>
                                    <View style={styles.metricItem}>
                                        <Feather name="eye" size={13} color={COLORS.textLight} />
                                        <Text style={styles.metricLabel}>VIEWS</Text>
                                        <Text style={styles.metricValue}>{request.views || 0}</Text>
                                    </View>
                                    <View style={styles.metricDivider} />
                                    <View style={styles.metricItem}>
                                        <Feather name="users" size={13} color={COLORS.textLight} />
                                        <Text style={styles.metricLabel}>CONTACTS</Text>
                                        <Text style={styles.metricValue}>{request.contacts || 0}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.manageBtn}>
                                    <Text style={styles.manageBtnText}>Manage</Text>
                                    <Feather name="chevron-right" size={14} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                )}

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
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Header Styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    logo: {
        width: 36,
        height: 36,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.error,
        borderWidth: 2,
        borderColor: COLORS.card,
    },
    profileButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    profileGradient: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    // Carousel & Banner Styles
    carouselContainer: {
        marginBottom: 20,
    },
    bannerSlide: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    bannerBackground: {
        width: '100%',
        height: 220,
    },
    bannerImage: {
        borderRadius: 20,
    },
    bannerGradient: {
        flex: 1,
        padding: 24,
        justifyContent: 'flex-end',
    },
    promoTag: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    promoTagText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    bannerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    bannerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.95)',
        lineHeight: 21,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 14,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    dotActive: {
        backgroundColor: COLORS.primary,
        width: 24,
    },
    // Stats Cards Styles
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        lineHeight: 32,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginTop: 2,
        marginBottom: 6,
    },
    statMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    statMetaText: {
        fontSize: 9,
        color: COLORS.primary,
        fontWeight: '600',
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    viewAllText: {
        fontSize: 13,
        color: COLORS.primary,
        fontWeight: '600',
    },
    // Empty State
    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    // Request Card
    requestCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    postedDateWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    postedDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    cardContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    cardMain: {
        flex: 1,
        paddingRight: 12,
    },
    requestTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    locationText: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    budgetSection: {
        alignItems: 'flex-end',
    },
    budgetLabel: {
        fontSize: 9,
        color: COLORS.textLight,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    budgetCurrency: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
    budgetAmount: {
        fontSize: 20,
        color: COLORS.primary,
        fontWeight: '700',
    },
    budgetPeriod: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    metricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metricLabel: {
        fontSize: 9,
        color: COLORS.textLight,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    metricDivider: {
        width: 1,
        height: 20,
        backgroundColor: COLORS.border,
        marginHorizontal: 16,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    manageBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
});

export default TenantDashboardScreen;
