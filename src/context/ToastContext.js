import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const TOAST_TYPES = {
    success: {
        icon: 'check-circle',
        backgroundColor: '#10B981',
        iconColor: '#FFFFFF',
    },
    error: {
        icon: 'x-circle',
        backgroundColor: '#EF4444',
        iconColor: '#FFFFFF',
    },
    warning: {
        icon: 'alert-triangle',
        backgroundColor: '#F59E0B',
        iconColor: '#FFFFFF',
    },
    info: {
        icon: 'info',
        backgroundColor: '#3B82F6',
        iconColor: '#FFFFFF',
    },
};

const Toast = ({ toast, onHide }) => {
    const translateY = useRef(new Animated.Value(100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    const { type = 'info', message, duration = 3000 } = toast;
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;

    useEffect(() => {
        // Animate in
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto hide after duration
        const timer = setTimeout(() => {
            hideToast();
        }, duration);

        return () => clearTimeout(timer);
    }, []);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 100,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onHide();
        });
    };

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    backgroundColor: config.backgroundColor,
                    transform: [{ translateY }],
                    opacity,
                    bottom: insets.bottom + 20,
                },
            ]}
        >
            <View style={styles.toastContent}>
                <Feather name={config.icon} size={20} color={config.iconColor} />
                <Text style={styles.toastMessage} numberOfLines={2}>
                    {message}
                </Text>
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
                <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
        </Animated.View>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const show = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
        return id;
    }, []);

    const success = useCallback((message, duration) => {
        return show(message, 'success', duration);
    }, [show]);

    const error = useCallback((message, duration) => {
        return show(message, 'error', duration);
    }, [show]);

    const warning = useCallback((message, duration) => {
        return show(message, 'warning', duration);
    }, [show]);

    const info = useCallback((message, duration) => {
        return show(message, 'info', duration);
    }, [show]);

    const hide = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const hideAll = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider value={{ show, success, error, warning, info, hide, hideAll }}>
            {children}
            <View style={styles.toastsWrapper} pointerEvents="box-none">
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} onHide={() => hide(toast.id)} />
                ))}
            </View>
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    toastsWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    toastContainer: {
        position: 'absolute',
        marginHorizontal: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        maxWidth: width - 32,
    },
    toastContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    toastMessage: {
        flex: 1,
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: '#FFFFFF',
        lineHeight: 20,
    },
    closeButton: {
        marginLeft: 12,
        padding: 4,
    },
});

export default ToastContext;
