import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { reportBadLead, getAgentBadLeadReports, BAD_LEAD_REASONS } from '../../lib/agentService';

const COLORS = {
    primary: '#FE9200',
    primaryDark: '#E58300',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
};

const BadLeadReportScreen = ({ navigation, route }) => {
    const { leadId, leadTitle } = route.params || {};
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState(leadId ? 'report' : 'history');
    const [selectedReason, setSelectedReason] = useState(null);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const result = await getAgentBadLeadReports(user.id);
            if (result.success) setReports(result.data || []);
        } catch (error) {
            // silent
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedReason) {
            toast.error('Please select a reason');
            return;
        }
        if (description.trim().length < 10) {
            toast.error('Please provide a detailed description (at least 10 characters)');
            return;
        }

        setSubmitting(true);
        try {
            const result = await reportBadLead({
                leadId,
                agentId: user.id,
                reason: selectedReason,
                description: description.trim(),
            });

            if (result.success) {
                toast.success('Bad lead reported successfully');
                setSelectedReason(null);
                setDescription('');
                setActiveTab('history');
                loadReports();
            } else {
                toast.error(result.error || 'Failed to submit report');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'reviewed': return COLORS.primary;
            case 'resolved': return '#10B981';
            case 'rejected': return COLORS.error;
            default: return COLORS.warning;
        }
    };

    const renderReportForm = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Lead Info */}
            {leadTitle && (
                <View style={styles.leadInfoCard}>
                    <Feather name="alert-circle" size={18} color={COLORS.error} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.leadInfoLabel}>Reporting Lead</Text>
                        <Text style={styles.leadInfoTitle}>{leadTitle}</Text>
                    </View>
                </View>
            )}

            {/* Reason Selection */}
            <Text style={styles.fieldLabel}>Reason for Report *</Text>
            <View style={styles.reasonsContainer}>
                {BAD_LEAD_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason.value;
                    return (
                        <TouchableOpacity
                            key={reason.value}
                            style={[styles.reasonChip, isSelected && styles.reasonChipActive]}
                            onPress={() => setSelectedReason(reason.value)}
                        >
                            <Feather
                                name={isSelected ? 'check-circle' : 'circle'}
                                size={16}
                                color={isSelected ? COLORS.primary : COLORS.textLight}
                            />
                            <Text style={[styles.reasonText, isSelected && styles.reasonTextActive]}>
                                {reason.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Description */}
            <Text style={styles.fieldLabel}>Detailed Description *</Text>
            <View style={styles.textAreaWrapper}>
                <TextInput
                    style={styles.textArea}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Explain why this lead is bad. Include specifics about what happened..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    maxLength={1000}
                />
                <Text style={styles.charCount}>{description.length}/1000</Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
                style={[
                    styles.submitBtn,
                    (!selectedReason || description.trim().length < 10 || submitting) && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedReason || description.trim().length < 10 || submitting}
            >
                {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Feather name="flag" size={18} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Submit Report</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={{ height: 30 }} />
        </ScrollView>
    );

    const renderHistory = () => (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} colors={[COLORS.primary]} />
            }
        >
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : reports.length === 0 ? (
                <View style={styles.emptyState}>
                    <Feather name="check-circle" size={40} color={COLORS.textLight} />
                    <Text style={styles.emptyTitle}>No Reports</Text>
                    <Text style={styles.emptySubtitle}>You haven't reported any bad leads yet</Text>
                </View>
            ) : (
                reports.map((report) => (
                    <View key={report.id} style={styles.reportCard}>
                        <View style={styles.reportHeader}>
                            <View style={styles.reportIconWrap}>
                                <Feather name="flag" size={16} color={COLORS.error} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.reportReason}>
                                    {BAD_LEAD_REASONS.find(r => r.value === report.reason)?.label || report.reason}
                                </Text>
                                <Text style={styles.reportDate}>
                                    {new Date(report.created_at).toLocaleDateString('en-US', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) + '20' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                                    {(report.status || 'pending').charAt(0).toUpperCase() + (report.status || 'pending').slice(1)}
                                </Text>
                            </View>
                        </View>
                        {report.description && (
                            <Text style={styles.reportDescription} numberOfLines={2}>{report.description}</Text>
                        )}
                        {report.lead && (
                            <View style={styles.reportLeadInfo}>
                                <Feather name="user" size={12} color={COLORS.textLight} />
                                <Text style={styles.reportLeadText}>{report.lead.name || 'Unknown Lead'}</Text>
                            </View>
                        )}
                    </View>
                ))
            )}
            <View style={{ height: 30 }} />
        </ScrollView>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bad Lead Reports</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {leadId && (
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'report' && styles.tabActive]}
                        onPress={() => setActiveTab('report')}
                    >
                        <Text style={[styles.tabText, activeTab === 'report' && styles.tabTextActive]}>
                            New Report
                        </Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.tabActive]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                        My Reports
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'report' ? renderReportForm() : renderHistory()}
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
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
        gap: 8,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 30,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.textSecondary,
    },
    tabTextActive: {
        color: COLORS.primary,
        fontFamily: 'DMSans_600SemiBold',
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    centerContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    leadInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.errorLight,
        borderRadius: 12,
        padding: 14,
        gap: 10,
        marginBottom: 20,
    },
    leadInfoLabel: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: COLORS.error,
    },
    leadInfoTitle: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginTop: 2,
    },
    fieldLabel: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 10,
    },
    reasonsContainer: {
        gap: 8,
        marginBottom: 24,
    },
    reasonChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        gap: 10,
    },
    reasonChipActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    reasonText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    reasonTextActive: {
        color: COLORS.primary,
        fontFamily: 'DMSans_500Medium',
    },
    textAreaWrapper: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
    },
    textArea: {
        height: 140,
        padding: 14,
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
    },
    charCount: {
        fontSize: 11,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textLight,
        textAlign: 'right',
        paddingRight: 14,
        paddingBottom: 10,
    },
    submitBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.error,
        borderRadius: 30,
        paddingVertical: 15,
        gap: 8,
    },
    submitBtnDisabled: {
        opacity: 0.5,
    },
    submitBtnText: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: {
        fontSize: 17,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
    },
    reportCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 10,
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reportIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.errorLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    reportReason: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
    },
    reportDate: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textLight,
        marginTop: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 11,
        fontFamily: 'DMSans_600SemiBold',
    },
    reportDescription: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        marginTop: 10,
        lineHeight: 20,
    },
    reportLeadInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    reportLeadText: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textLight,
    },
});

export default BadLeadReportScreen;
