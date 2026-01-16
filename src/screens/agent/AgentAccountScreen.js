import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FONTS } from '../../constants/theme';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
};

const AgentAccountScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData, signOut } = useAuth();
    const [walletBalance] = useState(70);
    const [plan] = useState('Free');

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]
        );
    };

    const getUserName = () => {
        if (userData?.name) return userData.name;
        if (user?.email) return user.email.split('@')[0];
        return 'Agent';
    };

    const getUserInitials = () => {
        const name = getUserName();
        return name.charAt(0).toUpperCase();
    };

    const isVerified = userData?.kyc_status === 'verified' || true;

    const MenuItem = ({ icon, iconBg, iconColor, title, value, valueColor, onPress, isExternal }) => (
        <TouchableOpacity
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.menuIcon, { backgroundColor: iconBg || COLORS.background }]}>
                <Feather name={icon} size={18} color={iconColor || COLORS.textSecondary} />
            </View>
            <Text style={styles.menuTitle}>{title}</Text>
            <View style={styles.menuRight}>
                {value && (
                    <Text style={[styles.menuValue, valueColor && { color: valueColor }]}>
                        {value}
                    </Text>
                )}
                {isExternal ? (
                    <Feather name="external-link" size={18} color={COLORS.textSecondary} />
                ) : (
                    <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Account</Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => navigation.navigate('AgentSettings')}
                >
                    <Feather name="settings" size={22} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{getUserInitials()}</Text>
                        </View>
                        {isVerified && (
                            <View style={styles.verifiedBadge}>
                                <Feather name="check" size={12} color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                    <Text style={styles.profileName}>{getUserName()}</Text>
                    <View style={styles.verifiedRow}>
                        <Feather name="shield" size={14} color={COLORS.success} />
                        <Text style={styles.verifiedText}>Verified Agent</Text>
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>WALLET</Text>
                        <Text style={styles.statValue}>{walletBalance} Credits</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardRight]}>
                        <Text style={styles.statLabel}>PLAN</Text>
                        <Text style={styles.statValueDark}>{plan}</Text>
                    </View>
                </View>

                {/* Menu Section 1 - Profile */}
                <View style={styles.menuSection}>
                    <MenuItem
                        icon="user"
                        iconBg="#DBEAFE"
                        iconColor="#3B82F6"
                        title="Personal Information"
                        onPress={() => navigation.navigate('Profile')}
                    />
                    <View style={styles.menuDivider} />
                    <MenuItem
                        icon="briefcase"
                        iconBg="#FEF3C7"
                        iconColor="#F59E0B"
                        title="Agency Profile"
                        onPress={() => toast.info('Agency Profile coming soon')}
                    />
                    <View style={styles.menuDivider} />
                    <MenuItem
                        icon="shield"
                        iconBg="#D1FAE5"
                        iconColor="#10B981"
                        title="Verification Status"
                        value="Verified"
                        valueColor={COLORS.success}
                        onPress={() => toast.info('Verification details coming soon')}
                    />
                </View>

                {/* Menu Section 2 - Settings */}
                <View style={styles.menuSection}>
                    <MenuItem
                        icon="bell"
                        iconBg="#EDE9FE"
                        iconColor="#8B5CF6"
                        title="Notifications"
                        onPress={() => toast.info('Notifications coming soon')}
                    />
                    <View style={styles.menuDivider} />
                    <MenuItem
                        icon="lock"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Security"
                        onPress={() => toast.info('Security coming soon')}
                    />
                </View>

                {/* Menu Section 3 - Support */}
                <View style={styles.menuSection}>
                    <MenuItem
                        icon="headphones"
                        iconBg="#FCE7F3"
                        iconColor="#EC4899"
                        title="Support"
                        isExternal
                        onPress={() => navigation.navigate('Support')}
                    />
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                    activeOpacity={0.9}
                >
                    <Feather name="log-out" size={18} color="#FFFFFF" />
                    <Text style={styles.signOutText}>Log Out</Text>
                </TouchableOpacity>

                {/* Version */}
                <Text style={styles.versionText}>Version 2.4.0 (Build 18)</Text>

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
    settingsButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 36,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.card,
    },
    profileName: {
        fontSize: 22,
        fontFamily: FONTS.bold,
        color: COLORS.text,
        marginBottom: 6,
    },
    verifiedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.successLight,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    verifiedText: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
        color: COLORS.success,
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 18,
        marginRight: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statCardRight: {
        marginRight: 0,
        marginLeft: 10,
    },
    statLabel: {
        fontSize: 11,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    statValueDark: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    menuSection: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuTitle: {
        flex: 1,
        fontSize: 15,
        fontFamily: FONTS.medium,
        color: COLORS.text,
        marginLeft: 14,
    },
    menuRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuValue: {
        fontSize: 13,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
    },
    menuDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 70,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
        marginTop: 8,
    },
    signOutText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: '#FFFFFF',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 16,
    },
});

export default AgentAccountScreen;
