import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = '458457543968-nea91cst4jt83u20ec4vo3jem4185gdg.apps.googleusercontent.com';
// Note: androidClientId is for STANDALONE BUILDS only, not Expo Go

const SignUpScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number is required for agents');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    // Agent registration only
    const result = await signUp(email, password, {
      name: name.trim(),
      phone: phone.trim(),
      type: 'agent',
      referralCode: referralCode.trim() || null,
    });

    setLoading(false);

    if (result.success) {
      if (result.emailConfirmationRequired) {
        Alert.alert(
          'Verify Your Email',
          'Please check your email inbox (and spam folder) to verify your account before signing in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Success', 'Agent account created successfully!');
      }
    } else {
      Alert.alert('Sign Up Failed', result.error);
    }
  };

  // Use Google Auth - for Expo Go, only expoClientId works
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_WEB_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // Uncomment for STANDALONE BUILDS:
    // androidClientId: 'YOUR_ANDROID_CLIENT_ID',
  });

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleToken(authentication?.accessToken);
    } else if (response?.type === 'error') {
      console.error('Google auth error:', response.error);
      Alert.alert('Error', 'Failed to sign up with Google');
      setGoogleLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (accessToken) => {
    if (!accessToken) {
      console.error('No access token received');
      setGoogleLoading(false);
      return;
    }

    try {
      console.log('Got Google access token, signing in to Supabase...');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: accessToken,
      });

      if (error) {
        console.error('Supabase sign in error:', error);
        Alert.alert('Error', 'Failed to complete sign up with Google');
      } else {
        console.log('Signed up successfully:', data?.user?.email);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      Alert.alert('Error', 'Failed to complete sign up');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      console.log('Starting Google OAuth sign up...');

      if (!request) {
        Alert.alert('Please Wait', 'Google Sign Up is initializing. Please try again.');
        setGoogleLoading(false);
        return;
      }

      await promptAsync();
    } catch (error) {
      console.error('Google Sign Up Error:', error);
      Alert.alert('Error', 'Failed to start Google sign up');
      setGoogleLoading(false);
    }
  };

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
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="chevron-left" size={28} color="#1F2937" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.agentBadge}>
              <Feather name="briefcase" size={16} color="#FE9200" />
              <Text style={styles.agentBadgeText}>Agent Registration</Text>
            </View>
            <Text style={styles.title}>Create Agent Account</Text>
            <Text style={styles.subtitle}>
              Join Yoombaa to access leads and grow your business
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Phone (Required for Agents) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Feather name="phone" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+254 700 000 000"
                  placeholderTextColor="#9CA3AF"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Referral Code (Optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Referral Code <Text style={styles.optionalText}>(Optional)</Text></Text>
              <View style={styles.inputContainer}>
                <Feather name="gift" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., YOOM1234"
                  placeholderTextColor="#9CA3AF"
                  value={referralCode}
                  onChangeText={(text) => setReferralCode(text.toUpperCase())}
                  autoCapitalize="characters"
                />
              </View>
              <Text style={styles.referralHint}>
                Enter a referral code to get 2 bonus credits!
              </Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signupButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.signupButtonText}>Create Agent Account</Text>
                  <Feather name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.divider} />
            </View>

            {/* Google Sign Up */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignUp}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#1F2937" />
              ) : (
                <>
                  <Image
                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                    style={styles.googleIcon}
                  />
                  <Text style={styles.googleButtonText}>Sign up with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  backButton: {
    marginTop: 16,
    marginBottom: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: 24,
  },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  agentBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#FE9200',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  form: {
    width: '100%',
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
  optionalText: {
    fontWeight: '400',
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 4,
  },
  referralHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#10B981',
  },
  signupButton: {
    flexDirection: 'row',
    backgroundColor: '#FE9200',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 32,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#6B7280',
    fontSize: 15,
  },
  loginLink: {
    color: '#7C3AED',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SignUpScreen;