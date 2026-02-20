import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { getSavedProperties, unsaveProperty } from '../../lib/propertyService';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
};

const SavedPropertiesScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savedProperties, setSavedProperties] = useState([]);

    const fetchSaved = useCallback(async () => {
        if (!user?.id) return;

        try {
            const result = await getSavedProperties(user.id);
            if (result.success) {
                setSavedProperties(result.data || []);
            }
        } catch (error) {
            console.error('Error fetching saved properties:', error);
            toast.error('Failed to load saved properties');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchSaved();
    }, [fetchSaved]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSaved();
    };

    const handleUnsave = (propertyId) => {
        Alert.alert(
            'Remove Saved Property',
            'Are you sure you want to remove this from your saved list?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await unsaveProperty(user.id, propertyId);
                        if (result.success) {
                            setSavedProperties(prev => prev.filter(item => item.property_id !== propertyId));
                            toast.success('Property removed from saved list');
                        } else {
                            toast.error('Failed to remove property');
                        }
                    },
                },
            ]
        );
    };

    const formatPrice = (price) => {
        if (!price) return 'Price TBD';
        return `KSh ${parseInt(price).toLocaleString()}`;
    };

    const PropertyCard = ({ item }) => {
        const property = item.property;
        if (!property) return null;

        const agentName = property.agent?.name || 'Unknown Agent';
        const imageUri = property.images?.[0];

        return (
            <TouchableOpacity
                style={styles.propertyCard}
                activeOpacity={0.95}
                onPress={() => {
                    // Navigate to property detail if screen exists
                }}
            >
                {/* Image */}
                <View style={styles.imageContainer}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.propertyImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Feather name="home" size={32} color={COLORS.border} />
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.heartButton}
                        onPress={() => handleUnsave(property.id)}
                    >
                        <Feather name="heart" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                    {property.listing_type && (
                        <View style={styles.listingTypeBadge}>
                            <Text style={styles.listingTypeText}>
                                {property.listing_type === 'rent' ? 'FOR RENT' : 'FOR SALE'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>
                        {property.title || `${property.property_type || 'Property'} in ${property.city || 'N/A'}`}
                    </Text>

                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={13} color={COLORS.primary} />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {property.address || property.city || 'Location TBD'}
                        </Text>
                    </View>

                    <View style={styles.detailsRow}>
                        {property.bedrooms != null && (
                            <View style={styles.detailItem}>
                                <Feather name="grid" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.detailText}>{property.bedrooms} Bed</Text>
                            </View>
                        )}
                        {property.bathrooms != null && (
                            <View style={styles.detailItem}>
                                <Feather name="droplet" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.detailText}>{property.bathrooms} Bath</Text>
                            </View>
                        )}
                        {property.area && (
                            <View style={styles.detailItem}>
                                <Feather name="maximize" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.detailText}>{property.area} {property.area_unit || 'sqft'}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.priceText}>{formatPrice(property.price)}</Text>
                        {property.listing_type === 'rent' && <Text style={styles.pricePeriod}>/mo</Text>}
                    </View>

                    <View style={styles.agentRow}>
                        <View style={styles.agentAvatar}>
                            <Text style={styles.agentAvatarText}>
                                {agentName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.agentName} numberOfLines={1}>{agentName}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading saved properties...</Text>
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
                <Text style={styles.headerTitle}>Saved Properties</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Count */}
            <View style={styles.countRow}>
                <Text style={styles.countText}>{savedProperties.length} saved properties</Text>
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
                {savedProperties.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconWrapper}>
                            <Feather name="heart" size={48} color={COLORS.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No Saved Properties</Text>
                        <Text style={styles.emptyText}>
                            Properties you save will appear here.{'\n'}
                            Browse listings in the Properties section.
                        </Text>
                    </View>
                ) : (
                    savedProperties.map((item) => (
                        <PropertyCard key={item.id} item={item} />
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
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
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
    headerPlaceholder: {
        width: 40,
    },
    // Count
    countRow: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    countText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    // Property Card
    propertyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    imageContainer: {
        height: 180,
        position: 'relative',
    },
    propertyImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heartButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listingTypeBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    listingTypeText: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    cardContent: {
        padding: 16,
    },
    propertyTitle: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 10,
    },
    locationText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        flex: 1,
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    priceText: {
        fontSize: 20,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    pricePeriod: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginLeft: 2,
    },
    agentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 8,
    },
    agentAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    agentAvatarText: {
        fontSize: 12,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.primary,
    },
    agentName: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
        flex: 1,
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default SavedPropertiesScreen;
