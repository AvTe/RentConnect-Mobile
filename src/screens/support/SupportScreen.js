import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// TODO: Update with actual Yoombaa support contact details for production
const SUPPORT_WHATSAPP = '254700000000'; // TODO: replace with actual WhatsApp number
const SUPPORT_EMAIL = 'support@yoombaa.com';
const SUPPORT_PHONE = '+254700000000'; // TODO: replace with actual phone number

import { COLORS, FONTS } from '../../constants/theme';

const FAQ_ITEMS = [
    {
        id: 1,
        question: 'How do I post a rental request?',
        answer: 'Tap on "Post New Request" from the dashboard or create a new request from the Requests tab. Fill in your preferred location, property type, and budget.',
    },
    {
        id: 2,
        question: 'How will agents contact me?',
        answer: 'Agents will reach out via the phone number or email you provided. Make sure your contact details are up to date.',
    },
    {
        id: 3,
        question: 'Is the service free for tenants?',
        answer: 'Yes! Posting rental requests is completely free for tenants. You only pay when you find and rent a property.',
    },
    {
        id: 4,
        question: 'How do I edit or delete my request?',
        answer: 'Go to My Requests, tap on the request you want to modify, and select Manage to edit, pause, or delete it.',
    },
];

const SupportScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [expandedFaq, setExpandedFaq] = useState(null);

    const toggleFaq = (id) => {
        setExpandedFaq(expandedFaq === id ? null : id);
    };

    const openLink = (url, errorMsg) => {
        Linking.openURL(url).catch(() => Alert.alert('Error', errorMsg || 'Could not open link'));
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Support</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Contact Card */}
                <View style={styles.contactCard}>
                    <View style={styles.contactIconContainer}>
                        <Feather name="headphones" size={28} color="#FFFFFF" />
                    </View>
                    <View style={styles.contactContent}>
                        <Text style={styles.contactTitle}>Need immediate help?</Text>
                        <Text style={styles.contactSubtitle}>Our support team is available 24/7</Text>
                    </View>
                </View>

                {/* Contact Options */}
                <View style={styles.optionsRow}>
                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => openLink(`https://wa.me/${SUPPORT_WHATSAPP}`, 'Could not open WhatsApp')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: '#D1FAE5' }]}>
                            <Feather name="message-circle" size={22} color="#059669" />
                        </View>
                        <Text style={styles.optionText}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => openLink(`mailto:${SUPPORT_EMAIL}`, 'Could not open email client')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: '#DBEAFE' }]}>
                            <Feather name="mail" size={22} color="#2563EB" />
                        </View>
                        <Text style={styles.optionText}>Email Us</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => openLink(`tel:${SUPPORT_PHONE}`, 'Could not open phone dialer')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.optionIcon, { backgroundColor: '#EDE9FE' }]}>
                            <Feather name="phone" size={22} color="#7C3AED" />
                        </View>
                        <Text style={styles.optionText}>Call Us</Text>
                    </TouchableOpacity>
                </View>

                {/* FAQ Section */}
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

                {FAQ_ITEMS.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.faqCard}
                        onPress={() => toggleFaq(item.id)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.faqHeader}>
                            <Text style={styles.faqQuestion}>{item.question}</Text>
                            <Feather
                                name={expandedFaq === item.id ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={COLORS.textSecondary}
                            />
                        </View>
                        {expandedFaq === item.id && (
                            <Text style={styles.faqAnswer}>{item.answer}</Text>
                        )}
                    </TouchableOpacity>
                ))}

                {/* Ticket Buttons */}
                <TouchableOpacity
                    style={styles.ticketBtn}
                    onPress={() => navigation.navigate('TicketList')}
                    activeOpacity={0.9}
                >
                    <Feather name="list" size={20} color="#FFFFFF" />
                    <Text style={styles.ticketBtnText}>View My Tickets</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.ticketBtnOutline}
                    onPress={() => navigation.navigate('CreateTicket')}
                    activeOpacity={0.9}
                >
                    <Feather name="plus" size={20} color={COLORS.primary} />
                    <Text style={styles.ticketBtnOutlineText}>Create Support Ticket</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
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
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    contactIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contactContent: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    contactSubtitle: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: 'rgba(255,255,255,0.9)',
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 28,
        gap: 10,
    },
    optionCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionText: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 16,
    },
    faqCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        fontSize: 15,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
        flex: 1,
        paddingRight: 12,
    },
    faqAnswer: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    ticketBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: 20,
        gap: 8,
    },
    ticketBtnText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    ticketBtnOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primaryLight,
        borderRadius: 14,
        paddingVertical: 16,
        marginTop: 10,
        gap: 8,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
    },
    ticketBtnOutlineText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
});

export default SupportScreen;

