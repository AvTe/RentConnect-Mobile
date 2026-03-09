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
    Modal,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getTenantLeads, updateLeadStatus, deleteLead } from '../../lib/leadService';

const { width } = Dimensions.get('window');
import { COLORS, FONTS } from '../../constants/theme';

const STATUS_COLORS = {
    active: { bg: '#D1FAE5', text: '#059669' },
    paused: { bg: '#FEF3C7', text: '#D97706' },
    expired: { bg: '#F3F4F6', text: '#6B7280' },
    sold_out: { bg: '#FEE2E2', text: '#DC2626' },
    converted: { bg: '#DBEAFE', text: '#2563EB' },
    completed: { bg: '#D1FAE5', text: '#059669' },
};

const MyRequestsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [requests, setRequests] = useState([]);

    // Modal states
    const [manageModalVisible, setManageModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const fetchRequests = useCallback(async () => {
        try {
            const result = await getTenantLeads(user?.email);
            if (result.success && result.data) {
                setRequests(result.data);
            }
            if (!result.success) throw new Error(result.error);
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

    // Refresh data when screen comes back into focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchRequests();
        });
        return unsubscribe;
    }, [navigation, fetchRequests]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequests();
    };

    const handleManage = (request) => {
        setSelectedRequest(request);
        setManageModalVisible(true);
    };

    const handleViewDetails = () => {
        setManageModalVisible(false);
        setTimeout(() => setDetailModalVisible(true), 200);
    };

    const handleEditRequest = () => {
        setManageModalVisible(false);
        navigation.navigate('TenantLead', { editLead: selectedRequest });
    };

    const handleToggleStatus = async () => {
        if (!selectedRequest) return;
        const newStatus = selectedRequest.status === 'active' ? 'paused' : 'active';
        setManageModalVisible(false);
        try {
            const result = await updateLeadStatus(selectedRequest.id, newStatus);
            if (!result.success) throw new Error(result.error);
            fetchRequests();
            toast.success(`Request ${newStatus === 'paused' ? 'paused' : 'activated'} successfully`);
        } catch (error) {
            console.error('Toggle status error:', error);
            toast.error('Failed to update status');
        }
    };

    const handleRateAgent = () => {
        setManageModalVisible(false);
        navigation.navigate('SubmitRating', { leadId: selectedRequest?.id });
    };

    const handleDelete = () => {
        setManageModalVisible(false);
        Alert.alert(
            'Delete Request',
            'Are you sure you want to delete this request? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await deleteLead(selectedRequest.id);
                            if (!result.success) throw new Error(result.error);
                            fetchRequests();
                            toast.success('Request deleted successfully');
                        } catch (error) {
                            console.error('Delete request error:', error);
                            toast.error('Failed to delete request');
                        }
                    },
                },
            ]
        );
    };

    const getStatusStyle = (status) => {
        return STATUS_COLORS[status] || STATUS_COLORS.expired;
    };

    const formatBudget = (budget) => {
        return parseInt(budget || 0).toLocaleString();
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
                    <Feather name="plus" size={14} color="#FFFFFF" />
                    <Text style={styles.newRequestText}>New Request</Text>
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
                                    <Text style={styles.budgetAmount}>KSh {formatBudget(request.budget)}</Text>
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

            {/* ===== Manage Request Modal (Bottom Sheet Style) ===== */}
            <Modal
                visible={manageModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setManageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setManageModalVisible(false)}
                >
                    <View style={styles.manageSheet} onStartShouldSetResponder={() => true}>
                        {/* Handle bar */}
                        <View style={styles.sheetHandle} />

                        <Text style={styles.sheetTitle}>Manage Request</Text>
                        {selectedRequest && (
                            <Text style={styles.sheetSubtitle}>
                                {selectedRequest.property_type || 'Property'} in {selectedRequest.location}
                            </Text>
                        )}

                        <View style={styles.sheetActions}>
                            <TouchableOpacity style={styles.sheetAction} onPress={handleViewDetails}>
                                <View style={[styles.sheetActionIcon, { backgroundColor: '#DBEAFE' }]}>
                                    <Feather name="file-text" size={18} color="#3B82F6" />
                                </View>
                                <View style={styles.sheetActionContent}>
                                    <Text style={styles.sheetActionTitle}>View Details</Text>
                                    <Text style={styles.sheetActionDesc}>See full request information</Text>
                                </View>
                                <Feather name="chevron-right" size={18} color={COLORS.textLight} />
                            </TouchableOpacity>

                            <View style={styles.sheetDivider} />

                            <TouchableOpacity style={styles.sheetAction} onPress={handleEditRequest}>
                                <View style={[styles.sheetActionIcon, { backgroundColor: COLORS.primaryLight }]}>
                                    <Feather name="edit-2" size={18} color={COLORS.primary} />
                                </View>
                                <View style={styles.sheetActionContent}>
                                    <Text style={styles.sheetActionTitle}>Edit Request</Text>
                                    <Text style={styles.sheetActionDesc}>Modify your request details</Text>
                                </View>
                                <Feather name="chevron-right" size={18} color={COLORS.textLight} />
                            </TouchableOpacity>

                            <View style={styles.sheetDivider} />

                            <TouchableOpacity style={styles.sheetAction} onPress={handleToggleStatus}>
                                <View style={[styles.sheetActionIcon, {
                                    backgroundColor: selectedRequest?.status === 'active' ? COLORS.warningLight : COLORS.successLight
                                }]}>
                                    <Feather
                                        name={selectedRequest?.status === 'active' ? 'pause-circle' : 'play-circle'}
                                        size={18}
                                        color={selectedRequest?.status === 'active' ? COLORS.warning : COLORS.success}
                                    />
                                </View>
                                <View style={styles.sheetActionContent}>
                                    <Text style={styles.sheetActionTitle}>
                                        {selectedRequest?.status === 'active' ? 'Pause Request' : 'Activate Request'}
                                    </Text>
                                    <Text style={styles.sheetActionDesc}>
                                        {selectedRequest?.status === 'active' ? 'Temporarily stop agent views' : 'Make visible to agents again'}
                                    </Text>
                                </View>
                                <Feather name="chevron-right" size={18} color={COLORS.textLight} />
                            </TouchableOpacity>

                            {(selectedRequest?.status === 'converted' || selectedRequest?.status === 'completed') && (
                                <>
                                    <View style={styles.sheetDivider} />
                                    <TouchableOpacity style={styles.sheetAction} onPress={handleRateAgent}>
                                        <View style={[styles.sheetActionIcon, { backgroundColor: '#FEF3C7' }]}>
                                            <Feather name="star" size={18} color="#F59E0B" />
                                        </View>
                                        <View style={styles.sheetActionContent}>
                                            <Text style={styles.sheetActionTitle}>Rate Agent</Text>
                                            <Text style={styles.sheetActionDesc}>Share your experience</Text>
                                        </View>
                                        <Feather name="chevron-right" size={18} color={COLORS.textLight} />
                                    </TouchableOpacity>
                                </>
                            )}

                            <View style={styles.sheetDivider} />

                            <TouchableOpacity style={styles.sheetAction} onPress={handleDelete}>
                                <View style={[styles.sheetActionIcon, { backgroundColor: COLORS.errorLight }]}>
                                    <Feather name="trash-2" size={18} color={COLORS.error} />
                                </View>
                                <View style={styles.sheetActionContent}>
                                    <Text style={[styles.sheetActionTitle, { color: COLORS.error }]}>Delete Request</Text>
                                    <Text style={styles.sheetActionDesc}>Permanently remove this request</Text>
                                </View>
                                <Feather name="chevron-right" size={18} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.sheetCancelBtn}
                            onPress={() => setManageModalVisible(false)}
                        >
                            <Text style={styles.sheetCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ===== View Details Modal ===== */}
            <Modal
                visible={detailModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setDetailModalVisible(false)}
                >
                    <View style={styles.detailCard} onStartShouldSetResponder={() => true}>
                        {/* Close button */}
                        <TouchableOpacity
                            style={styles.detailClose}
                            onPress={() => setDetailModalVisible(false)}
                        >
                            <Feather name="x" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        {/* Header */}
                        <View style={styles.detailHeader}>
                            <View style={styles.detailIconWrap}>
                                <Feather name="home" size={24} color={COLORS.primary} />
                            </View>
                            <Text style={styles.detailTitle}>Request Details</Text>
                        </View>

                        {selectedRequest && (
                            <View style={styles.detailBody}>
                                {/* Status badge */}
                                <View style={styles.detailStatusRow}>
                                    <View style={[styles.detailStatusBadge, {
                                        backgroundColor: getStatusStyle(selectedRequest.status).bg
                                    }]}>
                                        <View style={[styles.detailStatusDot, {
                                            backgroundColor: getStatusStyle(selectedRequest.status).text
                                        }]} />
                                        <Text style={[styles.detailStatusText, {
                                            color: getStatusStyle(selectedRequest.status).text
                                        }]}>
                                            {selectedRequest.status?.charAt(0).toUpperCase() + selectedRequest.status?.slice(1)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Detail rows */}
                                <View style={styles.detailRows}>
                                    <View style={styles.detailRow}>
                                        <View style={styles.detailRowIcon}>
                                            <Feather name="map-pin" size={16} color={COLORS.primary} />
                                        </View>
                                        <View style={styles.detailRowContent}>
                                            <Text style={styles.detailRowLabel}>Location</Text>
                                            <Text style={styles.detailRowValue}>{selectedRequest.location || 'N/A'}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRowDivider} />

                                    <View style={styles.detailRow}>
                                        <View style={styles.detailRowIcon}>
                                            <Feather name="home" size={16} color="#3B82F6" />
                                        </View>
                                        <View style={styles.detailRowContent}>
                                            <Text style={styles.detailRowLabel}>Property Type</Text>
                                            <Text style={styles.detailRowValue}>{selectedRequest.property_type || 'N/A'}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRowDivider} />

                                    <View style={styles.detailRow}>
                                        <View style={styles.detailRowIcon}>
                                            <Feather name="credit-card" size={16} color={COLORS.success} />
                                        </View>
                                        <View style={styles.detailRowContent}>
                                            <Text style={styles.detailRowLabel}>Budget</Text>
                                            <Text style={[styles.detailRowValue, { color: COLORS.primary, fontFamily: FONTS.bold }]}>
                                                KSh {formatBudget(selectedRequest.budget)}
                                                <Text style={styles.detailBudgetPeriod}> /month</Text>
                                            </Text>
                                        </View>
                                    </View>

                                    {selectedRequest.bedrooms && (
                                        <>
                                            <View style={styles.detailRowDivider} />
                                            <View style={styles.detailRow}>
                                                <View style={styles.detailRowIcon}>
                                                    <Feather name="layers" size={16} color={COLORS.purple} />
                                                </View>
                                                <View style={styles.detailRowContent}>
                                                    <Text style={styles.detailRowLabel}>Bedrooms</Text>
                                                    <Text style={styles.detailRowValue}>{selectedRequest.bedrooms}</Text>
                                                </View>
                                            </View>
                                        </>
                                    )}

                                    {selectedRequest.move_in_date && (
                                        <>
                                            <View style={styles.detailRowDivider} />
                                            <View style={styles.detailRow}>
                                                <View style={styles.detailRowIcon}>
                                                    <Feather name="calendar" size={16} color="#F59E0B" />
                                                </View>
                                                <View style={styles.detailRowContent}>
                                                    <Text style={styles.detailRowLabel}>Move-in Date</Text>
                                                    <Text style={styles.detailRowValue}>
                                                        {new Date(selectedRequest.move_in_date).toLocaleDateString('en-GB', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        })}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>

                                {/* Stats row */}
                                <View style={styles.detailStatsRow}>
                                    <View style={styles.detailStatCard}>
                                        <Feather name="eye" size={16} color={COLORS.purple} />
                                        <Text style={styles.detailStatValue}>{selectedRequest.views || 0}</Text>
                                        <Text style={styles.detailStatLabel}>Views</Text>
                                    </View>
                                    <View style={styles.detailStatCard}>
                                        <Feather name="users" size={16} color={COLORS.primary} />
                                        <Text style={styles.detailStatValue}>{selectedRequest.contacts || 0}</Text>
                                        <Text style={styles.detailStatLabel}>Contacts</Text>
                                    </View>
                                    <View style={styles.detailStatCard}>
                                        <Feather name="calendar" size={16} color={COLORS.success} />
                                        <Text style={styles.detailStatValue}>
                                            {new Date(selectedRequest.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                        </Text>
                                        <Text style={styles.detailStatLabel}>Posted</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.detailDoneBtn}
                            onPress={() => setDetailModalVisible(false)}
                        >
                            <Text style={styles.detailDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    newRequestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    newRequestText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.semiBold,
    },
    requestCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontFamily: FONTS.bold,
        letterSpacing: 0.5,
    },
    postedDate: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginLeft: 12,
        flex: 1,
    },
    budgetSection: {
        alignItems: 'flex-end',
    },
    budgetAmount: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    budgetPeriod: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    requestTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
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
        fontFamily: FONTS.regular,
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
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    manageText: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },

    // ===== Manage Modal (Bottom Sheet) =====
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    manageSheet: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 34,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 4,
    },
    sheetSubtitle: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginBottom: 20,
    },
    sheetActions: {
        backgroundColor: COLORS.background,
        borderRadius: 16,
        overflow: 'hidden',
    },
    sheetAction: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    sheetActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetActionContent: {
        flex: 1,
        marginLeft: 14,
    },
    sheetActionTitle: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    sheetActionDesc: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    sheetDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 70,
    },
    sheetCancelBtn: {
        marginTop: 16,
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: COLORS.background,
        alignItems: 'center',
    },
    sheetCancelText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
    },

    // ===== Detail Modal =====
    detailCard: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 34,
    },
    detailClose: {
        position: 'absolute',
        top: 16,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    detailHeader: {
        alignItems: 'center',
        marginBottom: 24,
        paddingTop: 8,
    },
    detailIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailTitle: {
        fontSize: 22,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    detailBody: {},
    detailStatusRow: {
        alignItems: 'center',
        marginBottom: 20,
    },
    detailStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        gap: 6,
    },
    detailStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    detailStatusText: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
    },
    detailRows: {
        backgroundColor: COLORS.background,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    detailRowIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailRowContent: {
        flex: 1,
        marginLeft: 14,
    },
    detailRowLabel: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    detailRowValue: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    detailBudgetPeriod: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
    },
    detailRowDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 66,
    },
    detailStatsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    detailStatCard: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        gap: 4,
    },
    detailStatValue: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    detailStatLabel: {
        fontSize: 11,
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
    },
    detailDoneBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    detailDoneBtnText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
});

export default MyRequestsScreen;

