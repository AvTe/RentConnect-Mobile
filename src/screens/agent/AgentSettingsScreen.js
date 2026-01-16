import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
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
    error: '#EF4444',
};

const AgentSettingsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData, signOut } = useAuth();
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(false);

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

    const SettingItem = ({ icon, iconBg, iconColor, title, subtitle, value, onPress, rightElement }) => (
        <TouchableOpacity
            style={styles.settingItem}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress && !rightElement}
        >
            <View style={[styles.settingIcon, { backgroundColor: iconBg || COLORS.background }]}>
                <Feather name={icon} size={18} color={iconColor || COLORS.textSecondary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {value && <Text style={styles.settingValue}>{value}</Text>}
            {rightElement}
            {onPress && !rightElement && (
                <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="arrow-left" size={22} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>App Settings</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileAvatar}>
                        <Text style={styles.avatarText}>{getUserInitials()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{getUserName()}</Text>
                        <Text style={styles.profileRole}>Yoombaa Agent • Verified</Text>
                    </View>
                </View>

                {/* General Section */}
                <Text style={styles.sectionLabel}>GENERAL</Text>
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="moon"
                        iconBg="#DBEAFE"
                        iconColor="#3B82F6"
                        title="Appearance"
                        value="System"
                        onPress={() => toast.info('Appearance settings coming soon')}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="globe"
                        iconBg="#D1FAE5"
                        iconColor="#10B981"
                        title="Language"
                        value="English (US)"
                        onPress={() => toast.info('Language settings coming soon')}
                    />
                </View>

                {/* Account Section */}
                <Text style={styles.sectionLabel}>ACCOUNT</Text>
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="lock"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Privacy & Security"
                        onPress={() => toast.info('Privacy settings coming soon')}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="key"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Change Password"
                        onPress={() => toast.info('Change password coming soon')}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="link"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Linked Accounts"
                        onPress={() => toast.info('Linked accounts coming soon')}
                    />
                </View>

                {/* Preferences Section */}
                <Text style={styles.sectionLabel}>PREFERENCES</Text>
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="bell"
                        iconBg="#FEF3C7"
                        iconColor="#F59E0B"
                        title="Push Notifications"
                        subtitle="For leads and messages"
                        rightElement={
                            <Switch
                                value={pushNotifications}
                                onValueChange={setPushNotifications}
                                trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
                                thumbColor="#FFFFFF"
                            />
                        }
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="mail"
                        iconBg="#EDE9FE"
                        iconColor="#8B5CF6"
                        title="Email Alerts"
                        subtitle="Weekly summaries"
                        rightElement={
                            <Switch
                                value={emailAlerts}
                                onValueChange={setEmailAlerts}
                                trackColor={{ false: '#E5E7EB', true: COLORS.primary }}
                                thumbColor="#FFFFFF"
                            />
                        }
                    />
                </View>

                {/* About Section */}
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="info"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="About Yoombaa"
                        onPress={() => toast.info('About coming soon')}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="help-circle"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Help & Support"
                        onPress={() => navigation.navigate('Support')}
                    />
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                >
                    <Text style={styles.signOutText}>Log Out</Text>
                </TouchableOpacity>

                {/* Version */}
                <Text style={styles.versionText}>Yoombaa Agent App</Text>
                <Text style={styles.versionNumber}>Version 1.0.2</Text>

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
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.semiBold,
        color: COLORS.text,
    },
    headerPlaceholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    avatarText: {
        fontSize: 22,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    profileInfo: {
        marginLeft: 14,
    },
    profileName: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.text,
    },
    profileRole: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        letterSpacing: 0.5,
        marginBottom: 10,
        marginTop: 8,
    },
    sectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingContent: {
        flex: 1,
        marginLeft: 14,
    },
    settingTitle: {
        fontSize: 15,
        fontFamily: FONTS.medium,
        color: COLORS.text,
    },
    settingSubtitle: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    settingValue: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginRight: 8,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 70,
    },
    signOutButton: {
        backgroundColor: COLORS.primaryLight,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    signOutText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: COLORS.primary,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 20,
    },
    versionNumber: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
});

export default AgentSettingsScreen;
