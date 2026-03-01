import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
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
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for the session to be available (it might take a moment after deep link / verifyOtp)
  useEffect(() => {
    if (session) {
      setSessionReady(true);
    } else {
      // Give the session a moment to be set from the recovery flow
      const timeout = setTimeout(() => {
        setSessionReady(true); // Allow the UI to render even without a session
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [session]);

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
      toast.error('Session expired. Please request a new password reset link.');
      navigation.goBack();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Password update error:', error);
        if (error.message.includes('same_password') || error.message.includes('same password')) {
          toast.error('New password must be different from your current password.');
        } else if (error.message.includes('weak_password') || error.message.includes('weak password')) {
          toast.error('Password is too weak. Please choose a stronger password.');
        } else if (error.message.includes('session_not_found') || error.message.includes('not authenticated')) {
          toast.error('Session expired. Please request a new reset link.');
          navigation.goBack();
        } else {
          toast.error(error.message || 'Failed to update password. Please try again.');
        }
        return;
      }

      setSuccess(true);
      toast.success('Password updated successfully!');

      // Clear recovery mode and sign out after a short delay
      // This ensures the app switches back to AuthStack before navigating to Login
      setTimeout(async () => {
        try {
          clearPasswordRecoveryMode();
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('Error during post-reset cleanup:', e);
        }
        // After signOut, user becomes null → AuthStack renders → Landing screen
        // The user will navigate to Login from there
      }, 2500);
    } catch (err) {
      console.error('Unexpected error updating password:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          <View style={styles.successIconContainer}>
            <Feather name="check-circle" size={48} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Password Updated!</Text>
          <Text style={styles.successDescription}>
            Your password has been successfully changed.{'\n'}
            Redirecting you to login screen...
          </Text>
          <ActivityIndicator size="small" color="#FE9200" style={{ marginTop: 24 }} />
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
        <View style={styles.content}>
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
        </View>
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
  content: {
    flex: 1,
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
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 120,
    marginBottom: 32,
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
  },
});

export default ResetPasswordScreen;
