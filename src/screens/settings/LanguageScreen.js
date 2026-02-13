import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, availableLanguages } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

const LanguageScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const toast = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Group languages by region
    const groupedLanguages = availableLanguages.reduce((groups, lang) => {
        const region = lang.region || 'Other';
        if (!groups[region]) {
            groups[region] = [];
        }
        groups[region].push(lang);
        return groups;
    }, {});

    // Filter languages based on search
    const filteredLanguages = searchQuery
        ? availableLanguages.filter(lang =>
            lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : null;

    const handleLanguageChange = async (langCode) => {
        if (langCode === language) return;

        setLoading(true);
        try {
            const success = await setLanguage(langCode);
            if (success) {
                const selectedLang = availableLanguages.find(l => l.code === langCode);
                toast.success(`Language changed to ${selectedLang?.name || langCode}`);
            }
        } catch (error) {
            toast.error('Failed to change language');
        } finally {
            setLoading(false);
        }
    };

    const LanguageItem = ({ lang }) => {
        const isSelected = language === lang.code;

        return (
            <TouchableOpacity
                style={[
                    styles.languageItem,
                    {
                        backgroundColor: colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                    }
                ]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.8}
                disabled={loading}
            >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <View style={styles.languageInfo}>
                    <Text style={[styles.languageName, { color: colors.text }]}>
                        {lang.name}
                    </Text>
                    <Text style={[styles.languageNative, { color: colors.textSecondary }]}>
                        {lang.nativeName}
                    </Text>
                </View>
                <View style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? colors.primary : colors.border }
                ]}>
                    {isSelected && (
                        <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const LanguageSection = ({ title, languages }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {title.toUpperCase()}
            </Text>
            <View style={styles.languageGrid}>
                {languages.map((lang) => (
                    <LanguageItem key={lang.code} lang={lang} />
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="chevron-left" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('language')}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
                <View style={[styles.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                    <Feather name="search" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={[styles.searchText, { color: colors.text }]}
                        placeholder="Search languages..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Feather name="x" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                </View>
            )}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Current Language */}
                <View style={[styles.currentLanguage, { backgroundColor: colors.primaryLight }]}>
                    <View style={styles.currentHeader}>
                        <Feather name="check-circle" size={18} color={colors.primary} />
                        <Text style={[styles.currentLabel, { color: colors.primary }]}>Current Language</Text>
                    </View>
                    <View style={styles.currentInfo}>
                        <Text style={styles.currentFlag}>
                            {availableLanguages.find(l => l.code === language)?.flag || '🌐'}
                        </Text>
                        <View>
                            <Text style={[styles.currentName, { color: colors.text }]}>
                                {availableLanguages.find(l => l.code === language)?.name || 'English'}
                            </Text>
                            <Text style={[styles.currentNative, { color: colors.textSecondary }]}>
                                {availableLanguages.find(l => l.code === language)?.nativeName || 'English'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Search Results or Grouped Languages */}
                {filteredLanguages ? (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                            SEARCH RESULTS ({filteredLanguages.length})
                        </Text>
                        {filteredLanguages.length === 0 ? (
                            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                                <Feather name="search" size={32} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No languages found
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.languageGrid}>
                                {filteredLanguages.map((lang) => (
                                    <LanguageItem key={lang.code} lang={lang} />
                                ))}
                            </View>
                        )}
                    </View>
                ) : (
                    <>
                        {/* Africa Region - Primary for Kenya */}
                        {groupedLanguages['Africa'] && (
                            <LanguageSection
                                title="🌍 African Languages"
                                languages={groupedLanguages['Africa']}
                            />
                        )}

                        {/* Global Languages */}
                        {groupedLanguages['Global'] && (
                            <LanguageSection
                                title="🌐 Global Languages"
                                languages={groupedLanguages['Global']}
                            />
                        )}

                        {/* Middle East */}
                        {groupedLanguages['Middle East'] && (
                            <LanguageSection
                                title="🌙 Middle East"
                                languages={groupedLanguages['Middle East']}
                            />
                        )}

                        {/* Asia */}
                        {groupedLanguages['Asia'] && (
                            <LanguageSection
                                title="🏯 Asian Languages"
                                languages={groupedLanguages['Asia']}
                            />
                        )}
                    </>
                )}

                {/* Info Note */}
                <View style={[styles.infoNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="info" size={16} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Changing the language will update all text throughout the app. Some content from the server may still appear in English.
                    </Text>
                </View>

                <View style={{ height: 100 }} />
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
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
    },
    placeholder: {
        width: 32,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    searchText: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
    },
    loadingOverlay: {
        padding: 12,
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    currentLanguage: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
    },
    currentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    currentLabel: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.5,
    },
    currentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    currentFlag: {
        fontSize: 32,
    },
    currentName: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
    },
    currentNative: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    languageGrid: {
        gap: 10,
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
    },
    languageFlag: {
        fontSize: 28,
        marginRight: 14,
    },
    languageInfo: {
        flex: 1,
    },
    languageName: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
    },
    languageNative: {
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        marginTop: 2,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    emptyState: {
        padding: 40,
        borderRadius: 12,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'DMSans_500Medium',
    },
    infoNote: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        lineHeight: 20,
    },
});

export default LanguageScreen;
