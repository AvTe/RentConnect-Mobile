import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

const COLORS = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    success: '#10B981',
    successLight: '#D1FAE5',
    error: '#EF4444',
    errorLight: '#FEE2E2',
};

const ChangePasswordScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const toast = useToast();
    const { colors } = useTheme();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const getPasswordStrength = () => {
        if (!newPassword) return null;
        const len = newPassword.length;
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
        const score = [len >= 8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

        if (score <= 2) return { label: 'Weak', color: COLORS.error, width: '33%' };
        if (score <= 3) return { label: 'Medium', color: '#F59E0B', width: '66%' };
        return { label: 'Strong', color: COLORS.success, width: '100%' };
    };

    const validate = () => {
        if (!currentPassword.trim()) {
            toast.warning('Please enter your current password');
            return false;
        }
        if (newPassword.length < 6) {
            toast.warning('New password must be at least 6 characters');
            return false;
        }
        if (newPassword === currentPassword) {
            toast.warning('New password must be different from current password');
            return false;
        }
        if (newPassword !== confirmPassword) {
            toast.warning('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleChangePassword = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            // Re-authenticate by signing in with current password
            const { data: { user }, error: signInError } = await supabase.auth.getUser();
            if (signInError || !user) throw new Error('Session expired. Please log in again.');

            const { error: reAuthError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (reAuthError) {
                toast.error('Current password is incorrect');
                setLoading(false);
                return;
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                let msg = 'Failed to update password.';
                if (updateError.message?.includes('same')) {
                    msg = 'New password must be different from your current password.';
                } else if (updateError.message?.includes('weak')) {
                    msg = 'Password is too weak. Please choose a stronger one.';
                } else if (updateError.message) {
                    msg = updateError.message;
                }
                toast.error(msg);
                setLoading(false);
                return;
            }

            setSuccess(true);
        } catch (error) {
            console.error('Change password error:', error);
            toast.error(error.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Feather name="check-circle" size={64} color={COLORS.success} />
                    </View>
                    <Text style={[styles.successTitle, { color: colors.text }]}>Password Changed!</Text>
                    <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                        Your password has been updated successfully. Use your new password next time you log in.
                    </Text>
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const strength = getPasswordStrength();

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Change Password</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Info Card */}
                    <View style={[styles.infoCard, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}>
                        <Feather name="shield" size={20} color={COLORS.primary} />
                        <Text style={[styles.infoText, { color: '#92400E' }]}>
                            Choose a strong password with at least 6 characters, including uppercase, lowercase, numbers, and symbols.
                        </Text>
                    </View>

                    {/* Current Password */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Feather name="lock" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Enter current password"
                                placeholderTextColor={colors.textSecondary}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry={!showCurrent}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                <Feather name={showCurrent ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* New Password */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Feather name="key" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Enter new password"
                                placeholderTextColor={colors.textSecondary}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNew}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                <Feather name={showNew ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {/* Password Strength */}
                        {strength && (
                            <View style={styles.strengthContainer}>
                                <View style={[styles.strengthBar, { backgroundColor: colors.border }]}>
                                    <View style={[styles.strengthFill, { width: strength.width, backgroundColor: strength.color }]} />
                                </View>
                                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                            </View>
                        )}
                    </View>

                    {/* Confirm Password */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm New Password</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Feather name="check-circle" size={18} color={
                                confirmPassword && confirmPassword === newPassword
                                    ? COLORS.success
                                    : colors.textSecondary
                            } style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="Re-enter new password"
                                placeholderTextColor={colors.textSecondary}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirm}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                            <Text style={styles.mismatchText}>Passwords do not match</Text>
                        )}
                    </View>
                </ScrollView>

                {/* Bottom Button */}
                <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                        onPress={handleChangePassword}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'DMSans_400Regular',
        lineHeight: 19,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: 'DMSans_500Medium',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 52,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
    },
    strengthContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 10,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontFamily: 'DMSans_600SemiBold',
    },
    mismatchText: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: '#EF4444',
        marginTop: 6,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    saveButton: {
        backgroundColor: '#FE9200',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
    },
    // Success state
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    successIcon: {
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 24,
        fontFamily: 'DMSans_700Bold',
        marginBottom: 12,
    },
    successDesc: {
        fontSize: 15,
        fontFamily: 'DMSans_400Regular',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    doneButton: {
        backgroundColor: '#FE9200',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 48,
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
    },
});

export default ChangePasswordScreen;
