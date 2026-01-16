import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import YoombaaLogo from '../../assets/yoombaa logo svg.svg';
import { FONTS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const handleTenantPress = () => {
        navigation.navigate('TenantLead');
    };

    const handleAgentPress = () => {
        navigation.navigate('SignUp');
    };

    const handleLoginPress = () => {
        navigation.navigate('Login');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ImageBackground
                source={require('../../assets/hero section img.jpg')}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                <LinearGradient
                    colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.4)']}
                    style={styles.gradientOverlay}
                />

                <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
                    {/* Logo Only - Clean */}
                    <View style={styles.logoSection}>
                        <YoombaaLogo width={140} height={48} />
                        <Text style={styles.tagline}>Kenya's #1 Rental Marketplace</Text>
                    </View>

                    {/* Bottom Card */}
                    <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>
                        <Text style={styles.title}>Find your perfect home</Text>
                        <Text style={styles.subtitle}>or connect with tenants looking for one</Text>

                        {/* Two Clean Buttons */}
                        <View style={styles.buttonsContainer}>
                            {/* Tenant Button - Primary */}
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleTenantPress}
                                activeOpacity={0.9}
                            >
                                <Feather name="home" size={20} color="#FFFFFF" />
                                <Text style={styles.primaryButtonText}>I'm Looking to Rent</Text>
                            </TouchableOpacity>

                            {/* Agent Button - Secondary */}
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={handleAgentPress}
                                activeOpacity={0.9}
                            >
                                <Feather name="briefcase" size={20} color="#FE9200" />
                                <Text style={styles.secondaryButtonText}>I'm a Real Estate Agent</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Login Link */}
                        <TouchableOpacity
                            style={styles.loginLink}
                            onPress={handleLoginPress}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.loginText}>
                                Already have an account? <Text style={styles.loginTextBold}>Sign in</Text>
                            </Text>
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
        paddingTop: 30,
    },
    tagline: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 10,
        fontFamily: FONTS.regular,
    },
    bottomCard: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    title: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: '#1F2937',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 28,
        fontFamily: FONTS.regular,
    },
    buttonsContainer: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#FE9200',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: FONTS.semiBold,
    },
    secondaryButton: {
        backgroundColor: '#FFF5E6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
    },
    secondaryButtonText: {
        color: '#FE9200',
        fontSize: 16,
        fontFamily: FONTS.semiBold,
    },
    loginLink: {
        alignItems: 'center',
        paddingVertical: 20,
        marginTop: 8,
    },
    loginText: {
        fontSize: 14,
        color: '#6B7280',
        fontFamily: FONTS.regular,
    },
    loginTextBold: {
        color: '#FE9200',
        fontFamily: FONTS.semiBold,
    },
});

export default LandingScreen;
