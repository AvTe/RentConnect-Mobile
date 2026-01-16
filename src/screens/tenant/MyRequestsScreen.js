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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
};

const STATUS_COLORS = {
    active: { bg: '#D1FAE5', text: '#059669' },
    paused: { bg: '#FEF3C7', text: '#D97706' },
    expired: { bg: '#F3F4F6', text: '#6B7280' },
    sold_out: { bg: '#FEE2E2', text: '#DC2626' },
};

const MyRequestsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState([]);

    const fetchRequests = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('tenant_email', user?.email)
                .order('created_at', { ascending: false });

            if (data) {
                setRequests(data);
            }
            if (error) throw error;
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const handleManage = (request) => {
        Alert.alert(
            'Manage Request',
            'What would you like to do?',
            [
                { text: 'View Details', onPress: () => navigation.navigate('RequestDetail', { requestId: request.id }) },
                { text: 'Edit', onPress: () => navigation.navigate('RequestDetail', { requestId: request.id, edit: true }) },
                { text: request.status === 'active' ? 'Pause' : 'Activate', onPress: () => toggleStatus(request) },
                { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(request) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const toggleStatus = async (request) => {
        const newStatus = request.status === 'active' ? 'paused' : 'active';
        try {
            await supabase
                .from('leads')
                .update({ status: newStatus })
                .eq('id', request.id);
            fetchRequests();
            toast.success('Status updated successfully');
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const confirmDelete = (request) => {
        Alert.alert(
            'Delete Request',
            'Are you sure you want to delete this request? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteRequest(request) },
            ]
        );
    };

    const deleteRequest = async (request) => {
        try {
            await supabase
                .from('leads')
                .delete()
                .eq('id', request.id);
            fetchRequests();
            toast.success('Request deleted successfully');
        } catch (error) {
            toast.error('Failed to delete request');
        }
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
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Requests</Text>
                    <Text style={styles.headerSubtitle}>Manage your property requests.</Text>
                </View>
                <TouchableOpacity
                    style={styles.newRequestBtn}
                    onPress={() => navigation.navigate('TenantLead')}
                    activeOpacity={0.9}
                >
                    <Feather name="plus" size={18} color="#FFFFFF" />
                    <Text style={styles.newRequestText}>New{'\n'}Request</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {requests.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <Feather name="inbox" size={48} color={COLORS.textSecondary} />
                        </View>
                        <Text style={styles.emptyTitle}>No requests yet</Text>
                        <Text style={styles.emptyText}>
                            Post your first rental request and{'\n'}let agents find properties for you.
                        </Text>
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={() => navigation.navigate('TenantLead')}
                        >
                            <Feather name="plus" size={20} color="#FFFFFF" />
                            <Text style={styles.createButtonText}>Create Request</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    requests.map((request) => (
                        <View key={request.id} style={styles.requestCard}>
                            {/* Header Row */}
                            <View style={styles.cardHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusStyle(request.status).bg }]}>
                                    <Text style={[styles.statusText, { color: getStatusStyle(request.status).text }]}>
                                        {request.status?.toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={styles.postedDate}>
                                    Posted {new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </Text>
                                <View style={styles.budgetSection}>
                                    <Text style={styles.budgetAmount}>KSh {parseInt(request.budget || 0).toLocaleString()}</Text>
                                    <Text style={styles.budgetPeriod}>/ MONTH</Text>
                                </View>
                            </View>

                            {/* Title */}
                            <Text style={styles.requestTitle}>
                                {request.property_type || 'Property'} In {request.location}
                            </Text>

                            {/* Location */}
                            <View style={styles.locationRow}>
                                <Feather name="map-pin" size={14} color={COLORS.primary} />
                                <Text style={styles.locationText}>{request.location}</Text>
                            </View>

                            {/* Footer */}
                            <View style={styles.cardFooter}>
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Feather name="eye" size={14} color={COLORS.textSecondary} />
                                        <Text style={styles.statLabel}>VIEWS</Text>
                                        <Text style={styles.statValue}>{request.views || 0}</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Feather name="users" size={14} color={COLORS.textSecondary} />
                                        <Text style={styles.statLabel}>CONTACTS</Text>
                                        <Text style={styles.statValue}>{request.contacts || 0}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.manageBtn}
                                    onPress={() => handleManage(request)}
                                >
                                    <Text style={styles.manageText}>Manage</Text>
                                    <Feather name="chevron-right" size={16} color={COLORS.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    newRequestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
    },
    newRequestText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 16,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    requestCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    postedDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginLeft: 12,
        flex: 1,
    },
    budgetSection: {
        alignItems: 'flex-end',
    },
    budgetAmount: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
    },
    budgetPeriod: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    requestTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    locationText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginLeft: 6,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 14,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 28,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    manageText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
});

export default MyRequestsScreen;
