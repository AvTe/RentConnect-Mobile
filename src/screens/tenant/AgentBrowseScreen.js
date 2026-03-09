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
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../context/ToastContext';
import {
    getAllAgents,
    searchAgents,
} from '../../lib/agentService';
import { COLORS, FONTS } from '../../constants/theme';

const AgentBrowseScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [agents, setAgents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchTimeout, setSearchTimeout] = useState(null);

    const loadAgents = useCallback(async () => {
        try {
            let result;
            if (searchQuery.trim()) {
                result = await searchAgents(searchQuery.trim());
            } else {
                result = await getAllAgents();
            }

            if (result.success) {
                setAgents(result.data);
            }
        } catch (error) {
            toast.error('Failed to load agents');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        loadAgents();
    }, []);

    // Refresh data when screen comes back into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadAgents();
        });
        return unsubscribe;
    }, [navigation]);

    // Debounced search
    useEffect(() => {
        if (searchTimeout) clearTimeout(searchTimeout);
        const timeout = setTimeout(() => {
            loadAgents();
        }, 400);
        setSearchTimeout(timeout);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAgents();
    };

    const renderAgentCard = (agent) => (
        <TouchableOpacity
            key={agent.id}
            style={styles.agentCard}
            onPress={() => navigation.navigate('AgentProfileView', { agentId: agent.id })}
            activeOpacity={0.7}
        >
            <View style={styles.agentAvatar}>
                {agent.avatar ? (
                    <Image source={{ uri: agent.avatar }} style={styles.agentAvatarImg} onError={() => {}} />
                ) : (
                    <Feather name="user" size={22} color={COLORS.primary} />
                )}
            </View>
            <View style={styles.agentInfo}>
                <Text style={styles.agentName} numberOfLines={1}>{agent.name || 'Agent'}</Text>
                {agent.agency_name ? (
                    <Text style={styles.agentCompany} numberOfLines={1}>{agent.agency_name}</Text>
                ) : null}
                {agent.city ? (
                    <View style={styles.locationRow}>
                        <Feather name="map-pin" size={11} color={COLORS.textLight} />
                        <Text style={styles.locationText}>{agent.city}</Text>
                    </View>
                ) : null}
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Find Agents</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Feather name="search" size={18} color={COLORS.textLight} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, city, or specialization"
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

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Finding agents...</Text>
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
                    {/* Results Count */}
                    <Text style={styles.resultsCount}>
                        {agents.length} agent{agents.length !== 1 ? 's' : ''} found
                    </Text>

                    {agents.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIcon}>
                                <Feather name="users" size={36} color={COLORS.textLight} />
                            </View>
                            <Text style={styles.emptyTitle}>No agents found</Text>
                            <Text style={styles.emptySubtitle}>
                                Try adjusting your search or filters
                            </Text>
                        </View>
                    ) : (
                        agents.map(renderAgentCard)
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
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    resultsCount: {
        fontSize: 13,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    agentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 10,
    },
    agentAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    agentAvatarImg: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    agentInfo: { flex: 1 },
    agentName: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    agentCompany: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.primary,
        marginTop: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 4,
    },
    locationText: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textLight,
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
    },
});

export default AgentBrowseScreen;
