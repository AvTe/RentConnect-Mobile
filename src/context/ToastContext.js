import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ToastContext = createContext(null);

const TOAST_TYPES = {
    success: { icon: 'check-circle', bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', iconColor: '#10B981' },
    error:   { icon: 'x-circle',     bg: '#FEF2F2', border: '#FECACA', color: '#991B1B', iconColor: '#EF4444' },
    warning: { icon: 'alert-circle', bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', iconColor: '#F59E0B' },
    info:    { icon: 'info',         bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF', iconColor: '#3B82F6' },
};

let toastId = 0;

const Toast = ({ toast, onDismiss, bottomOffset }) => {
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);
    const config = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

    React.useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();

        timerRef.current = setTimeout(() => {
            dismiss();
        }, toast.duration || 3000);

        return () => clearTimeout(timerRef.current);
    }, []);

    const dismiss = () => {
        clearTimeout(timerRef.current);
        Animated.parallel([
            Animated.timing(translateY, { toValue: 80, duration: 200, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => onDismiss(toast.id));
    };

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    backgroundColor: config.bg,
                    borderColor: config.border,
                    bottom: bottomOffset,
                    transform: [{ translateY }],
                    opacity,
                },
            ]}
        >
            <View style={styles.toastBody}>
                <Feather name={config.icon} size={20} color={config.iconColor} />
                <View style={styles.toastContent}>
                    {toast.title ? (
                        <Text style={[styles.toastTitle, { color: config.color }]}>{toast.title}</Text>
                    ) : null}
                    <Text style={[styles.toastMessage, { color: config.color }]} numberOfLines={3}>
                        {toast.message}
                    </Text>
                </View>
                <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="x" size={16} color={config.color} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const insets = useSafeAreaInsets();

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((type, message, options = {}) => {
        const id = ++toastId;
        const newToast = {
            id,
            type,
            message,
            title: options.title || null,
            duration: options.duration || 3000,
        };
        setToasts((prev) => {
            // Keep max 3 visible
            const updated = [...prev, newToast];
            return updated.slice(-3);
        });
        return id;
    }, []);

    const show = useCallback((message, options = {}) => {
        return showToast(options.type || 'info', message, options);
    }, [showToast]);

    const success = useCallback((message, options = {}) => showToast('success', message, options), [showToast]);
    const error = useCallback((message, options = {}) => showToast('error', message, options), [showToast]);
    const warning = useCallback((message, options = {}) => showToast('warning', message, options), [showToast]);
    const info = useCallback((message, options = {}) => showToast('info', message, options), [showToast]);

    const hide = useCallback((id) => removeToast(id), [removeToast]);
    const hideAll = useCallback(() => setToasts([]), []);

    const value = { show, success, error, warning, info, hide, hideAll };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <View style={styles.toastWrapper} pointerEvents="box-none">
                {toasts.map((toast, index) => (
                    <Toast
                        key={toast.id}
                        toast={toast}
                        onDismiss={removeToast}
                        bottomOffset={insets.bottom + 16 + index * 76}
                    />
                ))}
            </View>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return ctx;
};

const styles = StyleSheet.create({
    toastWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        top: 0,
        zIndex: 9999,
        elevation: 9999,
    },
    toastContainer: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 6,
    },
    toastBody: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    toastContent: {
        flex: 1,
    },
    toastTitle: {
        fontSize: 14,
        fontFamily: 'DMSans_600SemiBold',
        marginBottom: 2,
    },
    toastMessage: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        lineHeight: 18,
    },
});

export default ToastContext;

