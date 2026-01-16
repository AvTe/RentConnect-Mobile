import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import YoombaaLogo from '../../assets/yoombaa logo svg.svg';

const { width, height } = Dimensions.get('window');

const COLORS = {
    primary: '#FE9200',
    primaryDark: '#E58300',
    primaryLight: '#FFF5E6',
    background: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280',
};

const SplashScreen = () => {
    // Animation values
    const logoScale = useRef(new Animated.Value(0.5)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const loaderOpacity = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Logo entrance animation
        Animated.parallel([
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 4,
                tension: 50,
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // Text fade in after logo
        setTimeout(() => {
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }, 400);

        // Loader fade in
        setTimeout(() => {
            Animated.timing(loaderOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }, 600);

        // Continuous pulse animation
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.start();

        // Continuous rotate animation for loader
        const rotateAnimation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        rotateAnimation.start();

        return () => {
            pulseAnimation.stop();
            rotateAnimation.stop();
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            {/* Background gradient circles */}
            <View style={styles.backgroundDecor}>
                <View style={[styles.circle, styles.circle1]} />
                <View style={[styles.circle, styles.circle2]} />
                <View style={[styles.circle, styles.circle3]} />
            </View>

            {/* Main content */}
            <View style={styles.content}>
                {/* Logo with animation */}
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: logoOpacity,
                            transform: [{ scale: logoScale }, { scale: pulseAnim }],
                        },
                    ]}
                >
                    <View style={styles.logoWrapper}>
                        <YoombaaLogo width={180} height={60} />
                    </View>
                </Animated.View>

                {/* Tagline */}
                <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>
                    Find Your Perfect Home
                </Animated.Text>

                {/* Loading indicator */}
                <Animated.View style={[styles.loaderContainer, { opacity: loaderOpacity }]}>
                    <View style={styles.loaderTrack}>
                        <Animated.View
                            style={[
                                styles.loaderSpinner,
                                { transform: [{ rotate: spin }] },
                            ]}
                        >
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.primaryDark, 'transparent']}
                                style={styles.loaderGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                        </Animated.View>
                    </View>
                    <Text style={styles.loadingText}>Loading...</Text>
                </Animated.View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by Yoombaa</Text>
                <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    backgroundDecor: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    circle: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: COLORS.primaryLight,
        opacity: 0.5,
    },
    circle1: {
        width: 300,
        height: 300,
        top: -100,
        right: -100,
        opacity: 0.3,
    },
    circle2: {
        width: 200,
        height: 200,
        bottom: 100,
        left: -80,
        opacity: 0.4,
    },
    circle3: {
        width: 150,
        height: 150,
        bottom: -50,
        right: 50,
        opacity: 0.25,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logoContainer: {
        marginBottom: 16,
    },
    logoWrapper: {
        backgroundColor: COLORS.background,
        padding: 20,
        borderRadius: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 10,
    },
    tagline: {
        fontSize: 16,
        color: COLORS.textLight,
        fontWeight: '500',
        marginTop: 12,
        letterSpacing: 0.5,
    },
    loaderContainer: {
        marginTop: 60,
        alignItems: 'center',
    },
    loaderTrack: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderSpinner: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    loaderGradient: {
        width: 22,
        height: 44,
        borderTopLeftRadius: 22,
        borderBottomLeftRadius: 22,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 13,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    footer: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    versionText: {
        fontSize: 11,
        color: '#D1D5DB',
        marginTop: 4,
    },
});

export default SplashScreen;
