import React from 'react';
import {
    View,
    Text,
    StyleSheet,
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

                <Text style={styles.title}>My Messages</Text>

                <Text style={styles.description}>
                    Direct messaging with agents is coming{'\n'}soon. You'll be notified when agents{'\n'}respond to your requests.
                </Text>

                <View style={styles.infoCard}>
                    <Feather name="info" size={18} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>
                        Agents currently reach out via{'\n'}WhatsApp/Phone
                    </Text>
                </View>
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
        fontWeight: '600',
        color: COLORS.text,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
});

export default MessagesScreen;
