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
import { LinearGradient } from 'expo-linear-gradient';

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
                {/* Gradient Overlay for better text visibility */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.2)', 'rgba(254,146,0,0.3)']}
                    style={styles.gradientOverlay}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />

                {/* Content Container */}
                <View style={[styles.content, { paddingTop: insets.top + 20 }]}>

                    {/* Logo Section with Tagline */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../../assets/yoombaa logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.logoText}>yoombaa</Text>
                        <Text style={styles.tagline}>Kenya's #1 Rental Marketplace</Text>
                    </View>

                    {/* Spacer */}
                    <View style={styles.spacer} />

                    {/* Bottom Card */}
                    <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 24 }]}>
                        {/* Title */}
                        <Text style={styles.welcomeText}>Welcome! 👋</Text>
                        <Text style={styles.title}>Find your perfect home</Text>
                        <Text style={styles.subtitle}>or connect with tenants looking for one</Text>

                        {/* Option Cards */}
                        <View style={styles.cardsContainer}>
                            {/* Tenant Option */}
                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={handleTenantPress}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#FE9200', '#FF7A00']}
                                    style={styles.cardGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.cardContent}>
                                        <View style={styles.iconCircle}>
                                            <Feather name="home" size={24} color="#FE9200" />
                                        </View>
                                        <View style={styles.cardTextContainer}>
                                            <Text style={styles.cardTitle}>I'm Looking to Rent</Text>
                                            <Text style={styles.cardSubtitle}>Post your rental needs for free</Text>
                                        </View>
                                        <View style={styles.arrowCircle}>
                                            <Feather name="arrow-right" size={18} color="#FFFFFF" />
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Agent Option */}
                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={handleAgentPress}
                                activeOpacity={0.9}
                            >
                                <View style={styles.agentCard}>
                                    <View style={styles.cardContent}>
                                        <View style={[styles.iconCircle, styles.agentIconCircle]}>
                                            <Feather name="briefcase" size={24} color="#1F2937" />
                                        </View>
                                        <View style={styles.cardTextContainer}>
                                            <Text style={styles.agentCardTitle}>I'm a Real Estate Agent</Text>
                                            <Text style={styles.agentCardSubtitle}>Register & access quality leads</Text>
                                        </View>
                                        <View style={[styles.arrowCircle, styles.agentArrowCircle]}>
                                            <Feather name="arrow-right" size={18} color="#1F2937" />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLoginPress}
                            activeOpacity={0.8}
                        >
                            <Feather name="log-in" size={18} color="#FE9200" />
                            <Text style={styles.loginButtonText}>Sign in to your account</Text>
                        </TouchableOpacity>

                        {/* Skip Link */}
                        <TouchableOpacity
                            style={styles.skipContainer}
                            onPress={handleTenantPress}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.skipText}>Just browsing? Skip for now</Text>
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
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
    },
    logoSection: {
        alignItems: 'center',
        paddingTop: 50,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        backdropFilter: 'blur(10px)',
    },
    logo: {
        width: 50,
        height: 50,
    },
    logoText: {
        fontSize: 38,
        fontWeight: '300',
        color: '#FFFFFF',
        letterSpacing: 3,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tagline: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 8,
        letterSpacing: 0.5,
        fontWeight: '500',
    },
    spacer: {
        flex: 1,
    },
    bottomCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20,
    },
    welcomeText: {
        fontSize: 14,
        color: '#FE9200',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        marginTop: 4,
    },
    cardsContainer: {
        gap: 12,
    },
    optionCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#FE9200',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    cardGradient: {
        borderRadius: 16,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    agentIconCircle: {
        backgroundColor: '#F3F4F6',
    },
    cardTextContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 3,
    },
    cardSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
    },
    arrowCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    agentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    agentCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 3,
    },
    agentCardSubtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
    agentArrowCircle: {
        backgroundColor: '#F3F4F6',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        fontSize: 13,
        color: '#9CA3AF',
        paddingHorizontal: 16,
    },
    loginButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF5E6',
        borderRadius: 14,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    loginButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FE9200',
        marginLeft: 8,
    },
    skipContainer: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
});

export default LandingScreen;
