import React, { useState, useRef } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import OTPInput from '../components/OTPInput';

const ForgotPasswordScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { resetPassword, verifyResetOtp, passwordRecoveryMode } = useAuth();

  // Step: 'email' → 'otp'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef(null);

  const validateEmail = (e) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(e);
  };

  // Start a 60-second cooldown for resend
  const startResendTimer = () => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // STEP 1: Send reset email with 8-digit code
  const handleSendCode = async () => {
    if (!email.trim()) {
      toast.warning('Please enter your email address');
      return;
    }
    if (!validateEmail(email)) {
      toast.warning('Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      setStep('otp');
      startResendTimer();
      toast.success('6-digit code sent to your email!');
    } else {
      toast.error(result.error);
    }
  };

  // STEP 2: Verify OTP code
  const handleVerifyOtp = async (code) => {
    if (!code || code.length !== 6) {
      setOtpError('Please enter the complete 6-digit code');
      return;
    }

    setOtpError('');
    setLoading(true);
    const result = await verifyResetOtp(email, code);
    setLoading(false);

    if (result.success) {
      toast.success('Code verified! Set your new password.');
      navigation.navigate('ResetPassword');
    } else {
      setOtpError(result.error);
    }
  };

  // Navigate to ResetPassword if recovery mode is activated (deep link fallback)
  React.useEffect(() => {
    if (passwordRecoveryMode) {
      navigation.navigate('ResetPassword');
    }
  }, [passwordRecoveryMode]);

  // Resend code
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);

    if (result.success) {
      startResendTimer();
      setOtpError('');
      toast.success('New code sent to your email!');
    } else {
      toast.error(result.error);
    }
  };

  // ─── STEP 2: Enter OTP Code ───
  if (step === 'otp') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back to email step */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep('email')}
            >
              <Feather name="chevron-left" size={28} color="#1F2937" />
            </TouchableOpacity>

            {/* Header Icon */}
            <View style={styles.otpIconContainer}>
              <Feather name="mail" size={40} color="#FE9200" />
            </View>

            <Text style={styles.title}>Enter Reset Code</Text>
            <Text style={styles.description}>
              We've sent a 6-digit code to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <Text style={styles.otpHelper}>
              Check your inbox and spam folder. Enter the 6-digit code below.
            </Text>

            {/* OTP Input */}
            <View style={styles.otpSection}>
              <OTPInput
                length={6}
                onComplete={handleVerifyOtp}
                error={otpError}
              />
            </View>

            {/* Loading indicator while verifying */}
            {loading && (
              <View style={styles.verifyingContainer}>
                <ActivityIndicator size="small" color="#FE9200" />
                <Text style={styles.verifyingText}>Verifying code...</Text>
              </View>
            )}

            {/* Resend Section */}
            <View style={styles.resendSection}>
              <Text style={styles.resendLabel}>Didn't receive the code?</Text>
              {resendTimer > 0 ? (
                <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} disabled={loading}>
                  <Text style={styles.resendButton}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info box */}
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                The code is valid for 1 hour. If you don't find the email, check your spam/junk folder.
              </Text>
            </View>

            {/* Back to Login */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Input State
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="chevron-left" size={28} color="#1F2937" />
          </TouchableOpacity>

          {/* Header */}
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.description}>
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Feather name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. name@yoombaa.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Send Reset Code</Text>
            )}
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Feather name="arrow-left" size={18} color="#7C3AED" />
            <Text style={styles.backToLoginText}>Back to Login</Text>
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
  backButton: {
    marginTop: 16,
    marginBottom: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
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
  primaryButton: {
    backgroundColor: '#FE9200',
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  backToLoginText: {
    color: '#7C3AED',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  // OTP Step Styles
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  otpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  emailHighlight: {
    color: '#1F2937',
    fontWeight: '700',
  },
  otpHelper: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  otpSection: {
    marginBottom: 24,
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verifyingText: {
    fontSize: 14,
    color: '#FE9200',
    marginLeft: 8,
    fontWeight: '500',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  resendTimer: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  resendButton: {
    fontSize: 15,
    color: '#FE9200',
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;