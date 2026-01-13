import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    Image,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');



const LandingScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    // Tenants go to Lead Posting screen directly
    const handleTenantPress = () => {
        navigation.navigate('TenantLead');
    };

    // Only Agents can register
    const handleAgentPress = () => {
        navigation.navigate('SignUp');
    };

    const handleLoginPress = () => {
        navigation.navigate('Login');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background Image */}
            <ImageBackground
                source={require('../../assets/hero section img.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                {/* Dark Overlay for better text visibility */}
                <View style={styles.overlay} />

                {/* Content Container */}
                <View style={[styles.content, { paddingTop: insets.top + 20 }]}>

                    {/* Logo Section */}
                    <View style={styles.logoSection}>
                        <Image
                            source={require('../../assets/yoombaa logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.logoText}>yoombaa</Text>
                    </View>

                    {/* Spacer */}
                    <View style={styles.spacer} />

                    {/* Bottom Card */}
                    <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>
                        {/* Title */}
                        <Text style={styles.title}>How would you like to</Text>
                        <Text style={styles.titleHighlight}>use Yoombaa?</Text>

                        {/* Tenant Option - Goes to Login */}
                        <TouchableOpacity
                            style={styles.optionCard}
                            onPress={handleTenantPress}
                            activeOpacity={0.8}
                        >
                            <View style={styles.optionIconContainer}>
                                <Feather name="key" size={22} color="#FE9200" />
                            </View>
                            <View style={styles.optionTextContainer}>
                                <Text style={styles.optionTitle}>I am a Tenant</Text>
                                <Text style={styles.optionSubtitle}>Post your rental needs</Text>
                            </View>
                            <Feather name="arrow-right" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Agent Option - Goes to Registration */}
                        <TouchableOpacity
                            style={styles.optionCard}
                            onPress={handleAgentPress}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.optionIconContainer, styles.agentIconContainer]}>
                                <Feather name="briefcase" size={22} color="#0D9488" />
                            </View>
                            <View style={styles.optionTextContainer}>
                                <Text style={styles.optionTitle}>I am an Agent</Text>
                                <Text style={styles.optionSubtitle}>Register & access leads</Text>
                            </View>
                            <Feather name="arrow-right" size={20} color="#9CA3AF" />
                        </TouchableOpacity>

                        {/* Login Link */}
                        <TouchableOpacity
                            style={styles.loginContainer}
                            onPress={handleLoginPress}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.loginText}>Existing user? </Text>
                            <Text style={styles.loginLink}>Log in</Text>
                            <Feather name="arrow-right" size={16} color="#0D9488" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: 40,
    },
    logo: {
        width: 60,
        height: 60,
        tintColor: '#FFFFFF',
    },
    logoText: {
        fontSize: 36,
        fontWeight: '300',
        color: '#FFFFFF',
        marginTop: 10,
        letterSpacing: 2,
    },
    spacer: {
        flex: 1,
    },
    bottomCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    title: {
        fontSize: 26,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 32,
    },
    titleHighlight: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 28,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    optionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFF5E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    agentIconContainer: {
        backgroundColor: '#E0F2FE',
    },
    optionTextContainer: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    optionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 12,
    },
    loginText: {
        fontSize: 15,
        color: '#6B7280',
    },
    loginLink: {
        fontSize: 15,
        color: '#0D9488',
        fontWeight: '600',
    },
});

export default LandingScreen;
