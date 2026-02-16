import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getTicketById, addTicketReply, subscribeToTicketReplies } from '../../lib/ticketService';

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
    warning: '#F59E0B',
    error: '#EF4444',
};

const STATUS_CONFIG = {
    open: { label: 'Open', color: COLORS.primary, bg: COLORS.primaryLight },
    in_progress: { label: 'In Progress', color: '#2563EB', bg: '#DBEAFE' },
    resolved: { label: 'Resolved', color: COLORS.success, bg: '#D1FAE5' },
    closed: { label: 'Closed', color: COLORS.textSecondary, bg: '#F3F4F6' },
};

const TicketDetailScreen = ({ navigation, route }) => {
    const { ticketId } = route.params;
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();
    const scrollRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState(null);
    const [replies, setReplies] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadTicket();
    }, [ticketId]);

    useEffect(() => {
        if (!ticketId) return;
        const unsubscribe = subscribeToTicketReplies(ticketId, (newReply) => {
            setReplies(prev => [...prev, newReply]);
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        });
        return unsubscribe;
    }, [ticketId]);

    const loadTicket = async () => {
        try {
            const result = await getTicketById(ticketId);
            if (result.success) {
                setTicket(result.data);
                setReplies(result.data.replies || []);
            } else {
                toast.error('Failed to load ticket');
                navigation.goBack();
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || sending) return;

        setSending(true);
        try {
            const result = await addTicketReply(ticketId, {
                userId: user.id,
                message: replyText.trim(),
                isStaff: false,
            });
            if (result.success) {
                setReplyText('');
                // Reply will appear via real-time subscription
            } else {
                toast.error('Failed to send reply');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setSending(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const statusCfg = ticket ? (STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open) : STATUS_CONFIG.open;

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="chevron-left" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Ticket Details</Text>
                    <View style={{ width: 32 }} />
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Ticket #{ticketId?.slice(0, 8)}</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Ticket Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.ticketSubject}>{ticket?.subject}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                        </View>
                    </View>
                    <Text style={styles.ticketMessage}>{ticket?.message}</Text>
                    <View style={styles.infoMeta}>
                        <View style={styles.metaItem}>
                            <Feather name="tag" size={13} color={COLORS.textLight} />
                            <Text style={styles.metaText}>{ticket?.category || 'General'}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Feather name="clock" size={13} color={COLORS.textLight} />
                            <Text style={styles.metaText}>{formatDate(ticket?.created_at)}</Text>
                        </View>
                    </View>
                </View>

                {/* Replies */}
                {replies.length > 0 && (
                    <Text style={styles.sectionTitle}>Replies ({replies.length})</Text>
                )}

                {replies.map((reply) => {
                    const isStaff = reply.is_staff;
                    const isMe = reply.user_id === user?.id;
                    return (
                        <View
                            key={reply.id}
                            style={[
                                styles.replyCard,
                                isStaff && styles.replyStaff,
                                isMe && !isStaff && styles.replyMine,
                            ]}
                        >
                            <View style={styles.replyHeader}>
                                <View style={[styles.replyAvatar, isStaff && { backgroundColor: '#DBEAFE' }]}>
                                    <Feather
                                        name={isStaff ? 'headphones' : 'user'}
                                        size={14}
                                        color={isStaff ? '#2563EB' : COLORS.primary}
                                    />
                                </View>
                                <Text style={styles.replyName}>
                                    {isStaff ? 'Support Team' : (reply.user?.name || 'You')}
                                </Text>
                                <Text style={styles.replyTime}>{formatDate(reply.created_at)}</Text>
                            </View>
                            <Text style={styles.replyMessage}>{reply.message}</Text>
                        </View>
                    );
                })}

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Reply Input */}
            {ticket?.status !== 'closed' && (
                <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <TextInput
                        style={styles.replyInput}
                        placeholder="Type a reply..."
                        placeholderTextColor={COLORS.textLight}
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendBtn,
                            (!replyText.trim() || sending) && styles.sendBtnDisabled,
                        ]}
                        onPress={handleSendReply}
                        disabled={!replyText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Feather name="send" size={18} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </KeyboardAvoidingView>
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
        flex: 1,
        textAlign: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    ticketSubject: {
        fontSize: 17,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        flex: 1,
        paddingRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontFamily: 'DMSans_600SemiBold',
    },
    ticketMessage: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginBottom: 14,
    },
    infoMeta: {
        flexDirection: 'row',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textLight,
    },
    sectionTitle: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 12,
    },
    replyCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        marginBottom: 10,
    },
    replyStaff: {
        borderLeftWidth: 3,
        borderLeftColor: '#2563EB',
    },
    replyMine: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    replyAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    replyName: {
        fontSize: 13,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        flex: 1,
    },
    replyTime: {
        fontSize: 11,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textLight,
    },
    replyMessage: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        lineHeight: 21,
    },
    replyBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: COLORS.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 10,
    },
    replyInput: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.text,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: COLORS.textLight,
    },
});

export default TicketDetailScreen;
