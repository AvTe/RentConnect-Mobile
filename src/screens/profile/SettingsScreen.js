import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, availableLanguages } from '../../context/LanguageContext';


const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    error: '#EF4444',
};

const SettingsScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { user, signOut } = useAuth();
    const { colors } = useTheme();
    const { language, t } = useLanguage();
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(false);

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

    const getUserId = () => {
        if (user?.id) {
            return `${user.id.substring(0, 8).toUpperCase()}`;
        }
        return 'N/A';
    };



    const getCurrentLanguage = () => {
        const lang = availableLanguages.find(l => l.code === language);
        return lang ? `${lang.flag} ${lang.name}` : 'English';
    };

    const SettingItem = ({ icon, iconColor, iconBg, title, subtitle, value, onPress, rightElement }) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
                <Feather name={icon} size={18} color={iconColor} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            {value && <Text style={[styles.settingValue, { color: colors.textSecondary }]}>{value}</Text>}
            {rightElement}
            {onPress && !rightElement && (
                <Feather name="chevron-right" size={20} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Language */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('language').toUpperCase()}</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                    <SettingItem
                        icon="globe"
                        iconColor="#10B981"
                        iconBg="#D1FAE5"
                        title={t('language')}
                        value={getCurrentLanguage()}
                        onPress={() => navigation.navigate('LanguageSettings')}
                    />
                </View>

                {/* Account Settings */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('accountSettings').toUpperCase()}</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                    <SettingItem
                        icon="lock"
                        iconColor="#F59E0B"
                        iconBg="#FEF3C7"
                        title={t('passwordSecurity')}
                        onPress={() => Alert.alert(t('comingSoon') || 'Coming Soon', t('featureComingSoon') || 'This feature will be available in a future update.')}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="eye"
                        iconColor="#3B82F6"
                        iconBg="#DBEAFE"
                        title={t('privacySettings')}
                        onPress={() => Alert.alert(t('comingSoon') || 'Coming Soon', t('featureComingSoon') || 'This feature will be available in a future update.')}
                    />
                </View>

                {/* Notifications */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('notifications') || 'NOTIFICATIONS'}</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                    <SettingItem
                        icon="bell"
                        iconColor="#8B5CF6"
                        iconBg="#EDE9FE"
                        title={t('pushNotifications') || 'Push Notifications'}
                        subtitle={t('dailyUpdates') || 'Daily updates & alerts'}
                        rightElement={
                            <Switch
                                value={pushNotifications}
                                onValueChange={setPushNotifications}
                                trackColor={{ false: '#E5E7EB', true: colors.primary || COLORS.primary }}
                                thumbColor="#FFFFFF"
                            />
                        }
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="at-sign"
                        iconColor="#EC4899"
                        iconBg="#FCE7F3"
                        title={t('emailNotifications') || 'Email Notifications'}
                        subtitle={t('weeklyNewsletters') || 'Weekly newsletters'}
                        rightElement={
                            <Switch
                                value={emailNotifications}
                                onValueChange={setEmailNotifications}
                                trackColor={{ false: '#E5E7EB', true: colors.primary || COLORS.primary }}
                                thumbColor="#FFFFFF"
                            />
                        }
                    />
                </View>

                {/* App Info */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t('appInfo') || 'APP INFO'}</Text>
                <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                    <SettingItem
                        icon="info"
                        iconColor="#6B7280"
                        iconBg="#F3F4F6"
                        title={t('aboutYoombaa') || 'About Yoombaa'}
                        value="v2.4.1"
                        onPress={() => Alert.alert('About Yoombaa', 'Yoombaa v2.4.1\nRental marketplace connecting tenants with agents.\n\n© 2026 Yoombaa. All rights reserved.')}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <SettingItem
                        icon="file-text"
                        iconColor="#6B7280"
                        iconBg="#F3F4F6"
                        title={t('termsOfService') || 'Terms of Service'}
                        onPress={() => Linking.openURL('https://yoombaa.com/terms').catch(() => Alert.alert('Error', 'Could not open link'))}
                    />
                </View>

                {/* Help Card */}
                <View style={styles.helpCard}>
                    <View style={styles.helpIconContainer}>
                        <Feather name="headphones" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.helpContent}>
                        <Text style={styles.helpTitle}>Need help?</Text>
                        <Text style={styles.helpSubtitle}>Our team is available 24/7</Text>
                    </View>
                    <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Support')}>
                        <Text style={styles.chatBtnText}>Chat</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                    <Feather name="log-out" size={20} color={COLORS.error} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>User ID: {getUserId()}</Text>
                    <Text style={styles.footerText}>Made with ❤️ in Nairobi</Text>
                </View>

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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 12,
        marginTop: 8,
        letterSpacing: 0.5,
    },
    sectionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
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
        marginRight: 14,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text,
    },
    settingSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    settingValue: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginRight: 8,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginLeft: 70,
    },
    helpCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        borderRadius: 16,
        padding: 18,
        marginTop: 8,
        marginBottom: 24,
    },
    helpIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    helpContent: {
        flex: 1,
    },
    helpTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    helpSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    chatBtn: {
        backgroundColor: COLORS.card,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    chatBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.error,
    },
    footer: {
        alignItems: 'center',
        marginTop: 16,
    },
    footerText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
});

export default SettingsScreen;
