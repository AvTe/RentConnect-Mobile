import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, availableLanguages } from '../../context/LanguageContext';
import { updateUser } from '../../lib/database';
import { FONTS } from '../../constants/theme';

const AgentSettingsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { user, userData, signOut } = useAuth();
    const { colors } = useTheme();
    const { language, t } = useLanguage();
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(false);

    // Load persisted notification preferences
    useEffect(() => {
        const loadPrefs = async () => {
            try {
                const push = await AsyncStorage.getItem('pref_push_notifications');
                const email = await AsyncStorage.getItem('pref_email_alerts');
                if (push !== null) setPushNotifications(push === 'true');
                if (email !== null) setEmailAlerts(email === 'true');
            } catch {
                // fallback to defaults
            }
        };
        loadPrefs();
    }, []);

    const handleTogglePush = useCallback(async (value) => {
        setPushNotifications(value);
        try { await AsyncStorage.setItem('pref_push_notifications', String(value)); } catch {}
    }, []);

    const handleToggleEmail = useCallback(async (value) => {
        setEmailAlerts(value);
        try { await AsyncStorage.setItem('pref_email_alerts', String(value)); } catch {}
    }, []);

    const handleSignOut = () => {
        Alert.alert(
            t('signOut'),
            'Are you sure you want to sign out?',
            [
                { text: t('cancel'), style: 'cancel' },
                { text: t('signOut'), style: 'destructive', onPress: signOut },
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

    const getCurrentLanguage = () => {
        const lang = availableLanguages.find(l => l.code === language);
        return lang ? `${lang.flag} ${lang.name}` : 'English';
    };

    const SettingItem = ({ icon, iconBg, iconColor, title, subtitle, value, onPress, rightElement }) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress && !rightElement}
        >
            <View style={[styles.settingIcon, { backgroundColor: iconBg || colors.background }]}>
                <Feather name={icon} size={18} color={iconColor || colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            {value && <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>}
            {rightElement}
            {onPress && !rightElement && (
                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings')}</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.profileAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>{getUserInitials()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.profileName, { color: colors.text }]}>{getUserName()}</Text>
                        <Text style={[styles.profileRole, { color: colors.textSecondary }]}>Yoombaa Agent • Verified</Text>
                    </View>
                </View>

                {/* Language Section */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('language').toUpperCase()}</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SettingItem
                        icon="globe"
                        iconBg="#D1FAE5"
                        iconColor="#10B981"
                        title={t('language')}
                        value={getCurrentLanguage()}
                        onPress={() => navigation.navigate('LanguageSettings')}
                    />
                </View>

                {/* Account Section */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNT</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SettingItem
                        icon="lock"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Privacy & Security"
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="key"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Change Password"
                        onPress={() => navigation.navigate('ChangePassword')}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="link"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Linked Accounts"
                        onPress={() => toast.info('Linked accounts coming soon')}
                    />
                </View>

                {/* Preferences Section */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PREFERENCES</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SettingItem
                        icon="bell"
                        iconBg="#FEF3C7"
                        iconColor="#F59E0B"
                        title="Push Notifications"
                        subtitle="For leads and messages"
                        rightElement={
                            <Switch
                                value={pushNotifications}
                                onValueChange={handleTogglePush}
                                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                                thumbColor="#FFFFFF"
                            />
                        }
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="mail"
                        iconBg="#EDE9FE"
                        iconColor="#8B5CF6"
                        title="Email Alerts"
                        subtitle="Weekly summaries"
                        rightElement={
                            <Switch
                                value={emailAlerts}
                                onValueChange={handleToggleEmail}
                                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                                thumbColor="#FFFFFF"
                            />
                        }
                    />
                </View>

                {/* About Section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <SettingItem
                        icon="info"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="About Yoombaa"
                        onPress={() => toast.info('About coming soon')}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="help-circle"
                        iconBg="#F3F4F6"
                        iconColor="#6B7280"
                        title="Help & Support"
                        onPress={() => navigation.navigate('Support')}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="message-circle"
                        iconBg="#D1FAE5"
                        iconColor="#10B981"
                        title="My Support Tickets"
                        onPress={() => navigation.navigate('TicketList')}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="credit-card"
                        iconBg="#FFF5E6"
                        iconColor="#FE9200"
                        title="Subscription & Plans"
                        onPress={() => navigation.navigate('Subscription')}
                    />
                </View>

                {/* Sign Out Button */}
                <TouchableOpacity
                    style={[styles.signOutButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.signOutText, { color: colors.primary }]}>Log Out</Text>
                </TouchableOpacity>

                {/* Version */}
                <Text style={[styles.versionText, { color: colors.textSecondary }]}>Yoombaa Agent App</Text>
                <Text style={[styles.versionNumber, { color: colors.textSecondary }]}>Version 1.0.2</Text>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
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
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
    },
    profileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    avatarText: {
        fontSize: 22,
        fontFamily: FONTS.bold,
    },
    profileInfo: {
        marginLeft: 14,
    },
    profileName: {
        fontSize: 18,
        fontFamily: FONTS.bold,
    },
    profileRole: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: FONTS.semiBold,
        letterSpacing: 0.5,
        marginBottom: 10,
        marginTop: 8,
    },
    sectionCard: {
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
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
    },
    settingSubtitle: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        marginTop: 2,
    },
    settingValue: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        marginRight: 8,
    },
    divider: {
        height: 1,
        marginLeft: 70,
    },
    signOutButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
    },
    signOutText: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 13,
        fontFamily: FONTS.regular,
        marginTop: 20,
    },
    versionNumber: {
        textAlign: 'center',
        fontSize: 12,
        fontFamily: FONTS.regular,
        marginTop: 4,
    },
});

export default AgentSettingsScreen;

