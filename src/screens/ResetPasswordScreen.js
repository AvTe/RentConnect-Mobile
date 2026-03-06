import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const ResetPasswordScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { session, clearPasswordRecoveryMode } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef(null);
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // After success → 5-second countdown → auto-redirect to login
  useEffect(() => {
    if (!success) return;

    setCountdown(5);
    let count = 5;
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownRef.current);
        doRedirectToLogin();
      }
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [success]);

  // Clear local session + recovery mode → navigator switches to AuthStack → Landing
  // Uses scope: 'local' to avoid hanging on a network call
  const doRedirectToLogin = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Clear local session instantly (no network call, won't hang)
    supabase.auth.signOut({ scope: 'local' }).catch(() => {});

    // Small delay to let signOut state propagate, then clear recovery mode
    setTimeout(() => {
      clearPasswordRecoveryMode();
    }, 200);
  };

  const validatePassword = () => {
    if (!password || password.length < 6) {
      toast.warning('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      toast.warning('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) return;

    if (!session) {
      toast.error('Session expired. Please request a new reset code.');
      clearPasswordRecoveryMode();
      return;
    }

    setLoading(true);

    try {
      // Wrap in a 15-second timeout to prevent infinite spinner
      const updatePromise = supabase.auth.updateUser({ password });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 15000)
      );

      const { data, error } = await Promise.race([updatePromise, timeoutPromise]);

      if (!isMounted.current) return;

      if (error) {
        console.error('Password update error:', error);
        let msg = 'Failed to update password. Please try again.';
        if (error.message?.includes('same_password') || error.message?.includes('same password') || error.message?.includes('different')) {
          msg = 'New password must be different from your current password.';
        } else if (error.message?.includes('weak_password') || error.message?.includes('weak')) {
          msg = 'Password is too weak. Please choose a stronger password.';
        } else if (error.message?.includes('session') || error.message?.includes('authenticated')) {
          msg = 'Session expired. Please start the reset process again.';
        } else if (error.message) {
          msg = error.message;
        }
        toast.error(msg);
        setLoading(false);
        return;
      }

      // Success!
      setLoading(false);
      setSuccess(true);
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Password update exception:', err);
      if (err.message === 'TIMEOUT') {
        toast.error('Request timed out. Please check your connection and try again.');
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
      setLoading(false);
    }
  };

  // Success state — Password confirmation screen with auto-redirect
  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.successContent}>
          {/* Checkmark circle */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIconInner}>
              <Feather name="check" size={48} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.successTitle}>Password Updated!</Text>
          <Text style={styles.successDescription}>
            Your password has been successfully changed.{'\n'}
            You can now log in with your new password.
          </Text>

          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownNumber}>{countdown}</Text>
            </View>
            <Text style={styles.countdownText}>
              Redirecting to login in {countdown} second{countdown !== 1 ? 's' : ''}...
            </Text>
          </View>

          {/* Manual Go to Login button */}
          <TouchableOpacity
            style={styles.goToLoginButton}
            onPress={doRedirectToLogin}
            activeOpacity={0.8}
          >
            <Feather name="log-in" size={18} color="#FFFFFF" />
            <Text style={styles.goToLoginText}>Go to Login Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerIconContainer}>
            <Feather name="lock" size={40} color="#FE9200" />
          </View>

          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.description}>
            Enter your new password below. Make sure it's at least 6 characters long.
          </Text>

          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleUpdatePassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password requirements */}
          <View style={styles.requirementsList}>
            <View style={styles.requirementRow}>
              <Feather
                name={password.length >= 6 ? 'check-circle' : 'circle'}
                size={14}
                color={password.length >= 6 ? '#10B981' : '#9CA3AF'}
              />
              <Text style={[
                styles.requirementText,
                password.length >= 6 && styles.requirementMet,
              ]}>
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Feather
                name={password && password === confirmPassword ? 'check-circle' : 'circle'}
                size={14}
                color={password && password === confirmPassword ? '#10B981' : '#9CA3AF'}
              />
              <Text style={[
                styles.requirementText,
                password && password === confirmPassword && styles.requirementMet,
              ]}>
                Passwords match
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (loading || !password || !confirmPassword) && styles.buttonDisabled,
            ]}
            onPress={handleUpdatePassword}
            disabled={loading || !password || !confirmPassword}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  requirementsList: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#10B981',
  },
  primaryButton: {
    backgroundColor: '#FE9200',
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success Styles
  successContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  countdownBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FE9200',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  countdownNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FE9200',
  },
  countdownText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  goToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FE9200',
    borderRadius: 30,
    height: 56,
    paddingHorizontal: 32,
    gap: 8,
    width: '100%',
  },
  goToLoginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;
