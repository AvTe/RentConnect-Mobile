import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
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
    // Only animate the loading spinner
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Continuous rotate animation for loader
        const rotateAnimation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1200,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        rotateAnimation.start();

        return () => {
            rotateAnimation.stop();
        };
    }, []);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.container}>
            {/* Main content */}
            <View style={styles.content}>
                {/* Static Logo */}
                <View style={styles.logoContainer}>
                    <YoombaaLogo width={160} height={55} />
                </View>

                {/* Tagline */}
                <Text style={styles.tagline}>Find Your Perfect Home</Text>

                {/* Loading indicator */}
                <View style={styles.loaderContainer}>
                    <View style={styles.loaderTrack}>
                        <Animated.View
                            style={[
                                styles.loaderDot,
                                { transform: [{ rotate: spin }] },
                            ]}
                        >
                            <View style={styles.dot} />
                        </Animated.View>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by Yoombaa</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    logoContainer: {
        marginBottom: 12,
    },
    tagline: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '400',
        marginTop: 8,
    },
    loaderContainer: {
        marginTop: 50,
        alignItems: 'center',
    },
    loaderTrack: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 3,
        borderColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loaderDot: {
        position: 'absolute',
        width: 36,
        height: 36,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        position: 'absolute',
        top: -2,
        left: 13,
    },
    footer: {
        paddingBottom: 50,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#D1D5DB',
    },
});

export default SplashScreen;
