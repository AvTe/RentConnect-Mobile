import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    getAgentProperties,
    deleteProperty,
    PROPERTY_TYPES,
} from '../../lib/propertyService';
import { COLORS, FONTS } from '../../constants/theme';

const FILTER_TABS = ['All', 'Active', 'Rented', 'Inactive'];

const PropertyListScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [properties, setProperties] = useState([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const loadProperties = useCallback(async () => {
        if (!user?.id) return;
        try {
            const filters = {};
            if (activeFilter !== 'All') {
                filters.status = activeFilter.toLowerCase();
            }
            const result = await getAgentProperties(user.id, filters);
            if (result.success) {
                setProperties(result.data);
            }
        } catch (error) {
            toast.error('Failed to load properties');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id, activeFilter]);

    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadProperties();
        });
        return unsubscribe;
    }, [navigation, loadProperties]);

    const onRefresh = () => {
        setRefreshing(true);
        loadProperties();
    };

    const handleDelete = (propertyId) => {
        Alert.alert(
            'Delete Property',
            'Are you sure you want to delete this property listing?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await deleteProperty(propertyId);
                        if (result.success) {
                            toast.success('Property deleted');
                            loadProperties();
                        } else {
                            toast.error('Failed to delete property');
                        }
                    },
                },
            ]
        );
    };

    const getPropertyIcon = (type) => {
        const pt = PROPERTY_TYPES.find(p => p.id === type);
        return pt ? pt.icon : 'home';
    };

    const formatPrice = (price) => {
        if (!price) return 'N/A';
        return `KES ${Number(price).toLocaleString()}`;
    };

    const filteredProperties = properties.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.title?.toLowerCase().includes(q) ||
            p.city?.toLowerCase().includes(q) ||
            p.address?.toLowerCase().includes(q)
        );
    });

    const renderPropertyCard = (property) => (
        <TouchableOpacity
            key={property.id}
            style={styles.propertyCard}
            onPress={() => navigation.navigate('PropertyDetail', { propertyId: property.id })}
            activeOpacity={0.7}
        >
            {/* Image Placeholder */}
            <View style={styles.imageWrap}>
                {property.images && property.images.length > 0 ? (
                    <Image source={{ uri: property.images[0] }} style={styles.propertyImage} onError={() => {}} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Feather name={getPropertyIcon(property.property_type)} size={28} color={COLORS.textLight} />
                    </View>
                )}
                <View style={[
                    styles.statusTag,
                    { backgroundColor: property.is_available ? COLORS.successLight : '#FEF3C7' },
                ]}>
                    <Text style={[
                        styles.statusTagText,
                        { color: property.is_available ? COLORS.success : COLORS.warning },
                    ]}>
                        {property.is_available ? 'Available' : 'Rented'}
                    </Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.propertyTitle} numberOfLines={1}>{property.title}</Text>
                <View style={styles.locationRow}>
                    <Feather name="map-pin" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {property.city || property.address || 'No location'}
                    </Text>
                </View>

                <View style={styles.detailsRow}>
                    <Text style={styles.priceText}>{formatPrice(property.price)}</Text>
                    {property.listing_type === 'rent' && (
                        <Text style={styles.perMonth}>/month</Text>
                    )}
                </View>

                <View style={styles.featuresRow}>
                    {property.bedrooms != null && (
                        <View style={styles.featureItem}>
                            <Feather name="home" size={12} color={COLORS.textLight} />
                            <Text style={styles.featureText}>{property.bedrooms} bed</Text>
                        </View>
                    )}
                    {property.bathrooms != null && (
                        <View style={styles.featureItem}>
                            <Feather name="droplet" size={12} color={COLORS.textLight} />
                            <Text style={styles.featureText}>{property.bathrooms} bath</Text>
                        </View>
                    )}
                    {property.area != null && (
                        <View style={styles.featureItem}>
                            <Feather name="maximize" size={12} color={COLORS.textLight} />
                            <Text style={styles.featureText}>{property.area} {property.area_unit || 'sqft'}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: COLORS.error }]}
                    onPress={() => handleDelete(property.id)}
                >
                    <Feather name="trash-2" size={15} color={COLORS.error} />
                </TouchableOpacity>
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
                <Text style={styles.headerTitle}>My Properties</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Feather name="search" size={18} color={COLORS.textLight} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search properties..."
                        placeholderTextColor={COLORS.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x" size={18} color={COLORS.textLight} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTER_TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                            onPress={() => setActiveFilter(tab)}
                        >
                            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
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
                    {filteredProperties.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Feather name="home" size={36} color={COLORS.textLight} />
                            </View>
                            <Text style={styles.emptyTitle}>No properties yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Add your property listings to reach more tenants
                            </Text>

                        </View>
                    ) : (
                        filteredProperties.map(renderPropertyCard)
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
    addBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchWrap: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: COLORS.card,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.text,
    },
    filterRow: {
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    filterScroll: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 30,
        backgroundColor: COLORS.background,
        marginRight: 8,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
    },
    filterTabText: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    filterTabTextActive: {
        color: '#FFFFFF',
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    propertyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        marginBottom: 14,
    },
    imageWrap: {
        height: 160,
        backgroundColor: COLORS.background,
        position: 'relative',
    },
    propertyImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTag: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusTagText: {
        fontSize: 11,
        fontFamily: FONTS.semiBold,
    },
    cardBody: {
        padding: 14,
    },
    propertyTitle: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        flex: 1,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 10,
    },
    priceText: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    perMonth: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginLeft: 2,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: 14,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    featureText: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 14,
        paddingBottom: 14,
        gap: 8,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
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
        marginBottom: 24,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 8,
    },
    emptyBtnText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
});

export default PropertyListScreen;
