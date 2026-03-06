import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    purple: '#8B5CF6',
    purpleLight: '#EDE9FE',
};

const MessagesScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            {/* Empty State */}
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Feather name="message-square" size={48} color={COLORS.primary} />
                </View>

                <Text style={styles.title}>Messages Coming Soon</Text>

                <Text style={styles.description}>
                    Direct messaging with agents is coming{'\n'}soon. You'll be notified when agents{'\n'}respond to your requests.
                </Text>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoIconWrap}>
                        <Feather name="phone" size={18} color={COLORS.purple} />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>How agents reach you</Text>
                        <Text style={styles.infoText}>
                            Agents currently contact you via WhatsApp or Phone call using the number on your profile.
                        </Text>
                    </View>
                </View>

                {/* Update Profile CTA */}
                <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={() => navigation.navigate('Profile')}
                    activeOpacity={0.9}
                >
                    <Feather name="user" size={18} color="#FFFFFF" />
                    <Text style={styles.ctaBtnText}>Update Contact Info</Text>
                </TouchableOpacity>
            </View>
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
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingBottom: 80,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontFamily: 'DMSans_700Bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.card,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 14,
        width: '100%',
        marginBottom: 24,
    },
    infoIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.purpleLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        color: COLORS.text,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        color: COLORS.textSecondary,
        lineHeight: 19,
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    ctaBtnText: {
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
        color: '#FFFFFF',
    },
});

export default MessagesScreen;
