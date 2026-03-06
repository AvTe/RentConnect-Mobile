import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';

const PRIVACY_URL = 'https://www.yoombaa.com/privacy-policy';

const PrivacyPolicyScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const [loadProgress, setLoadProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy & Security</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            {/* Loading bar */}
            {isLoading && (
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { width: `${loadProgress * 100}%` }]} />
                </View>
            )}

            {/* WebView */}
            <WebView
                source={{ uri: PRIVACY_URL }}
                style={styles.webview}
                onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                startInLoadingState
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FE9200" />
                        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Loading Privacy Policy...
                        </Text>
                    </View>
                )}
                renderError={(errorDomain, errorCode, errorDesc) => (
                    <View style={styles.errorContainer}>
                        <Feather name="wifi-off" size={48} color={colors.textSecondary} />
                        <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load</Text>
                        <Text style={[styles.errorDesc, { color: colors.textSecondary }]}>
                            Please check your internet connection and try again.
                        </Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => navigation.replace('PrivacyPolicy')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
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
        fontFamily: 'DMSans_600SemiBold',
    },
    headerPlaceholder: {
        width: 40,
    },
    progressBar: {
        height: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FE9200',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FB',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        backgroundColor: '#F8F9FB',
    },
    errorTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_600SemiBold',
        marginTop: 16,
    },
    errorDesc: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    retryButton: {
        marginTop: 24,
        backgroundColor: '#FE9200',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
    },
});

export default PrivacyPolicyScreen;
