import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    Animated,
    Keyboard,
    StatusBar,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
    fetchLeads,
    getUnlockedLeadIds,
    getLeadState,
    LEAD_STATE_STYLES,
} from '../../lib/leadService';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
};

const LeadSearchScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { user } = useAuth();
    const inputRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    const [query, setQuery] = useState('');
    const [leads, setLeads] = useState([]);
    const [unlockedLeadIds, setUnlockedLeadIds] = useState(new Set());
    const [recentSearches, setRecentSearches] = useState([
        'Studio', 'Nairobi', '2 Bedroom', 'Meru', 'Apartment',
    ]);

    useEffect(() => {
        // Entry animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto focus with slight delay for animation
        const timer = setTimeout(() => {
            inputRef.current?.focus();
        }, 300);

        // Load leads data
        loadData();

        return () => clearTimeout(timer);
    }, []);

    const loadData = async () => {
        try {
            const [leadsResult, unlockedResult] = await Promise.all([
                fetchLeads(),
                user?.id ? getUnlockedLeadIds(user.id) : { success: false },
            ]);
            if (leadsResult.success) setLeads(leadsResult.leads);
            if (unlockedResult.success) setUnlockedLeadIds(new Set(unlockedResult.leadIds));
        } catch (e) {
            console.error('Search load error:', e);
        }
    };

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 20,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start(() => navigation.goBack());
    }, [navigation, fadeAnim, slideAnim]);

    const filteredLeads = leads.filter(lead => {
        if (!query.trim()) return false;
        const q = query.toLowerCase();
        return (
            lead.location?.toLowerCase().includes(q) ||
            lead.property_type?.toLowerCase().includes(q) ||
            lead.tenant_name?.toLowerCase().includes(q) ||
            lead.tenant_info?.name?.toLowerCase().includes(q)
        );
    });

    const handleLeadPress = (lead) => {
        Keyboard.dismiss();
        navigation.replace('LeadDetail', { leadId: lead.id });
    };

    const handleSuggestionPress = (suggestion) => {
        setQuery(suggestion);
    };

    const formatBudget = (budget) => {
        if (!budget) return 'TBD';
        if (budget >= 1000) return `KSh ${Math.round(budget / 1000)}K`;
        return `KSh ${budget.toLocaleString()}`;
    };

    const renderLeadItem = ({ item: lead }) => {
        const isUnlocked = unlockedLeadIds.has(lead.id);
        const state = getLeadState(lead, isUnlocked);
        const stateStyles = LEAD_STATE_STYLES[state];
        const tenantName = lead.tenant_info?.name || lead.tenant_name || 'Tenant';
        const propertyType = lead.property_type || 'Property';
        const location = lead.location || 'Location';
        const budget = lead.budget || 0;
        const claimedSlots = lead.claimed_slots || 0;
        const maxSlots = lead.max_slots || 3;

        return (
            <TouchableOpacity
                style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleLeadPress(lead)}
                activeOpacity={0.7}
            >
                <View style={styles.resultLeft}>
                    <View style={[styles.resultAvatar, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.resultAvatarText, { color: colors.primary }]}>
                            {tenantName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                </View>
                <View style={styles.resultContent}>
                    <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
                        Looking for {propertyType}
                    </Text>
                    <View style={styles.resultMeta}>
                        <Feather name="map-pin" size={11} color={colors.textSecondary} />
                        <Text style={[styles.resultMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {location}
                        </Text>
                        <Text style={[styles.resultDot, { color: colors.textSecondary }]}>·</Text>
                        <Text style={[styles.resultMetaText, { color: colors.textSecondary }]}>
                            {formatBudget(budget)}
                        </Text>
                    </View>
                    <View style={styles.resultBottom}>
                        <View style={[styles.slotPill, { backgroundColor: stateStyles.slotBg }]}>
                            <Text style={[styles.slotPillText, { color: stateStyles.statusColor }]}>
                                {claimedSlots}/{maxSlots} slots · {stateStyles.statusText}
                            </Text>
                        </View>
                        {isUnlocked && (
                            <View style={styles.unlockedPill}>
                                <Feather name="check-circle" size={10} color={COLORS.success} />
                                <Text style={styles.unlockedPillText}>Unlocked</Text>
                            </View>
                        )}
                    </View>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => {
        if (query.trim()) {
            return (
                <View style={styles.emptyContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: colors.background }]}>
                        <Feather name="search" size={28} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        Try searching for a different location, property type, or tenant name
                    </Text>
                </View>
            );
        }
        return null;
    };

    const renderSuggestions = () => {
        if (query.trim()) return null;
        return (
            <Animated.View style={[styles.suggestionsContainer, {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                    POPULAR SEARCHES
                </Text>
                <View style={styles.chipContainer}>
                    {recentSearches.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => handleSuggestionPress(item)}
                        >
                            <Feather name="trending-up" size={13} color={colors.primary} />
                            <Text style={[styles.chipText, { color: colors.text }]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 28 }]}>
                    SEARCH BY
                </Text>
                {[
                    { icon: 'map-pin', label: 'Location', example: 'e.g. Nairobi, Meru, Kisumu' },
                    { icon: 'home', label: 'Property Type', example: 'e.g. Studio, 1 Bedroom, Apartment' },
                    { icon: 'user', label: 'Tenant Name', example: 'e.g. John, Mary' },
                ].map((item, index) => (
                    <View
                        key={index}
                        style={[styles.hintRow, { borderBottomColor: colors.border }]}
                    >
                        <View style={[styles.hintIcon, { backgroundColor: colors.primaryLight }]}>
                            <Feather name={item.icon} size={16} color={colors.primary} />
                        </View>
                        <View style={styles.hintText}>
                            <Text style={[styles.hintLabel, { color: colors.text }]}>{item.label}</Text>
                            <Text style={[styles.hintExample, { color: colors.textSecondary }]}>{item.example}</Text>
                        </View>
                    </View>
                ))}
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <StatusBar barStyle="dark-content" />
            {/* Search Header */}
            <Animated.View style={[styles.searchHeader, {
                backgroundColor: colors.card,
                borderBottomColor: colors.border,
                opacity: fadeAnim,
            }]}>
                <View style={[styles.searchBarActive, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Feather name="search" size={18} color={colors.primary} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.searchInputActive, { color: colors.text }]}
                        placeholder="Search leads by location, type, name..."
                        placeholderTextColor={colors.textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        returnKeyType="search"
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Feather name="x-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                    <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Results / Suggestions */}
            {query.trim() ? (
                <Animated.View style={[styles.resultsWrapper, {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }]}>
                    <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                        {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'} found
                    </Text>
                    <FlatList
                        data={filteredLeads}
                        keyExtractor={(item) => item.id}
                        renderItem={renderLeadItem}
                        ListEmptyComponent={renderEmpty}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.resultsList}
                    />
                </Animated.View>
            ) : (
                renderSuggestions()
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        gap: 12,
    },
    searchBarActive: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        gap: 10,
    },
    searchInputActive: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        paddingVertical: 0,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    cancelText: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
    },
    suggestionsContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: 'DMSans_700Bold',
        letterSpacing: 1,
        marginBottom: 14,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 14,
    },
    hintIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hintText: {
        flex: 1,
    },
    hintLabel: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
    },
    hintExample: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        marginTop: 2,
    },
    resultsWrapper: {
        flex: 1,
        paddingHorizontal: 16,
    },
    resultCount: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    resultsList: {
        paddingBottom: 40,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        gap: 12,
    },
    resultLeft: {},
    resultAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultAvatarText: {
        fontSize: 17,
        fontFamily: 'DMSans_700Bold',
    },
    resultContent: {
        flex: 1,
        gap: 4,
    },
    resultTitle: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
    },
    resultMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    resultMetaText: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
    },
    resultDot: {
        fontSize: 12,
    },
    resultBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    slotPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    slotPillText: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
    },
    unlockedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    unlockedPillText: {
        fontSize: 10,
        fontFamily: 'DMSans_600SemiBold',
        color: '#10B981',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: 'DMSans_600SemiBold',
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default LeadSearchScreen;
