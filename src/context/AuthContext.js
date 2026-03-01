import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { createUser, getUser, updateUser } from '../lib/database';
import { logger } from '../lib/logger';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.log('Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          // User clicked password reset link - set recovery mode
          logger.log('Password recovery mode activated');
          setPasswordRecoveryMode(true);
          setLoading(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUserData(null);
          setPasswordRecoveryMode(false);
          setLoading(false);
        } else if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setUserData(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Fetch user data from users table
   */
  const fetchUserData = async (userId) => {
    try {
      const result = await getUser(userId);
      if (result.success && result.data) {
        setUserData(result.data);
      } else {
        // User might not exist in users table yet (new signup)
        logger.log('User not found in database, might be new signup');
        setUserData(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if the email exists in our users table first
      const { data: existingUser, error: lookupError } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!existingUser && !lookupError) {
        return {
          success: false,
          error: 'No account found with this email. Please sign up to create a new Yoombaa account.',
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        console.error('Supabase signin error:', error);

        // Map error messages to user-friendly messages
        let errorMessage = error.message;

        if (error.message.includes('Email not confirmed') ||
          error.message.includes('email_not_confirmed')) {
          errorMessage = 'Please verify your email address before signing in. Check your inbox (and spam folder) for the confirmation link.';
        } else if (error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials')) {
          // Supabase v2 returns "Invalid login credentials" for BOTH wrong password
          // and unconfirmed email. Try resending confirmation to differentiate.
          try {
            const { error: resendError } = await supabase.auth.resend({
              type: 'signup',
              email: normalizedEmail,
            });
            if (!resendError) {
              // Resend succeeded → email exists but is NOT confirmed
              errorMessage = 'Your email is not verified yet. We\'ve sent a new verification link to your inbox. Please verify your email and try again.';
            } else {
              // Resend failed → email is confirmed, so it's a wrong password
              errorMessage = 'Incorrect password. Please try again or use "Forgot Password" to reset it.';
            }
          } catch {
            errorMessage = 'Incorrect password. Please try again or use "Forgot Password" to reset it.';
          }
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please try again in a few minutes.';
        }

        return { success: false, error: errorMessage };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error signing in:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    }
  };

  /**
   * Sign up new user with email and password
   */
  const signUp = async (email, password, userMetadata) => {
    try {
      const userType = userMetadata.type || userMetadata.user_type || 'tenant';

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            name: userMetadata.name,
            type: userType,
            phone: userMetadata.phone || null,
          },
        },
      });

      if (error) {
        console.error('Supabase signup error:', error);

        let errorMessage = error.message;
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.message.includes('Password')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }

        return { success: false, error: errorMessage };
      }

      // Supabase returns a user with empty identities when email is already
      // registered but unconfirmed — treat this as "already registered"
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'This email is already registered. Please check your inbox for the confirmation link, or sign in if you already verified.',
        };
      }

      // If user was created successfully, create user record in database
      if (data.user) {
        const createResult = await createUser(data.user.id, {
          email: email.toLowerCase().trim(),
          name: userMetadata.name,
          phone: userMetadata.phone,
          type: userType,
          referredBy: userMetadata.referralCode || userMetadata.referredBy,
        });

        if (!createResult.success) {
          console.error('Error creating user in database:', createResult.error);
          // Don't fail the signup, user can still authenticate
        }
      }

      // Check if email confirmation is required
      const emailConfirmationRequired = !data.session;

      return {
        success: true,
        data,
        emailConfirmationRequired,
        message: emailConfirmationRequired
          ? 'Please check your email to verify your account.'
          : 'Account created successfully!'
      };
    } catch (error) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserData(null);
      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Send password reset email (sends a 6-digit OTP code)
   * NOTE: You must update the Supabase email template for "Reset Password" to include {{ .Token }}
   * so the email shows the 6-digit code prominently to the user.
   */
  const resetPassword = async (email) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      logger.log('Sending password reset OTP to:', normalizedEmail);

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

      if (error) {
        console.error('Password reset error:', error);

        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          return {
            success: false,
            error: 'Too many reset requests. Please wait a few minutes before trying again.'
          };
        }

        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'If an account exists with this email, you will receive a 6-digit code.'
      };
    } catch (error) {
      console.error('Error sending reset email:', error);
      return { success: false, error: 'Failed to send reset email. Please try again.' };
    }
  };

  /**
   * Verify the 6-digit OTP code from the password reset email
   * This does NOT require opening any supabase.co URL — works entirely via API
   */
  const verifyResetOtp = async (email, otpCode) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      logger.log('Verifying password reset OTP for:', normalizedEmail);

      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: otpCode,
        type: 'recovery',
      });

      if (error) {
        console.error('OTP verification error:', error);

        if (error.message.includes('expired') || error.message.includes('Token has expired')) {
          return { success: false, error: 'This code has expired. Please request a new one.' };
        }
        if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          return { success: false, error: 'Invalid code. Please check and try again.' };
        }

        return { success: false, error: error.message || 'Verification failed. Please try again.' };
      }

      // PASSWORD_RECOVERY event will fire from onAuthStateChange → sets passwordRecoveryMode
      logger.log('OTP verified successfully, recovery session set');
      return { success: true };
    } catch (error) {
      console.error('Error verifying reset OTP:', error);
      return { success: false, error: 'Verification failed. Please try again.' };
    }
  };

  /**
   * Clear password recovery mode flag
   */
  const clearPasswordRecoveryMode = () => {
    setPasswordRecoveryMode(false);
  };

  /**
   * Handle incoming deep link URL for auth (password recovery tokens)
   * Supports multiple URL formats from Supabase:
   * - Hash fragment: yoombaa://reset-password#access_token=xxx&refresh_token=xxx&type=recovery
   * - PKCE code: yoombaa://reset-password?code=xxx
   * - Token hash: ...?token_hash=xxx&type=recovery
   */
  const handleAuthDeepLink = async (url) => {
    if (!url) return false;

    try {
      logger.log('Handling auth deep link:', url);

      // Check for PKCE code in query parameters
      const questionIndex = url.indexOf('?');
      if (questionIndex !== -1) {
        const queryString = url.substring(questionIndex + 1).split('#')[0]; // get query before hash
        const queryParams = new URLSearchParams(queryString);
        
        // Handle PKCE code flow
        const code = queryParams.get('code');
        if (code) {
          logger.log('PKCE code found, exchanging for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error exchanging code for session:', error);
            return false;
          }
          // PASSWORD_RECOVERY event will be fired by onAuthStateChange
          return true;
        }

        // Handle token_hash flow
        const tokenHash = queryParams.get('token_hash');
        const type = queryParams.get('type');
        if (tokenHash && type === 'recovery') {
          logger.log('Token hash found, verifying OTP...');
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (error) {
            console.error('Error verifying recovery token:', error);
            return false;
          }
          return true;
        }
      }

      // Check for hash fragment tokens (implicit flow)
      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'recovery' && accessToken && refreshToken) {
          logger.log('Recovery tokens found, setting session...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting recovery session:', error);
            return false;
          }

          // PASSWORD_RECOVERY event will be fired by onAuthStateChange
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error handling auth deep link:', error);
      return false;
    }
  };

  /**
   * Verify a password recovery link pasted by the user (legacy fallback)
   * Now redirects to OTP-based flow
   */
  const verifyRecoveryLink = async (link) => {
    return { success: false, error: 'Please use the 6-digit code from your email instead.' };
  };

  /**
   * Update user profile
   */
  const updateProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const result = await updateUser(user.id, updates);

      if (result.success) {
        setUserData(result.data);
      }

      return result;
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Refresh user data from database
   */
  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  /**
   * Check if user has a specific role
   */
  const hasRole = (role) => {
    return userData?.role === role || userData?.type === role;
  };

  const value = {
    user,
    session,
    userData,
    userProfile: userData, // Alias for compatibility
    loading,
    passwordRecoveryMode,
    // Auth methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    handleAuthDeepLink,
    clearPasswordRecoveryMode,
    verifyRecoveryLink,
    verifyResetOtp,
    // Profile methods
    updateProfile,
    refreshUserData,
    refreshProfile: refreshUserData, // Alias for compatibility
    // Role helpers
    hasRole,
    isAgent: () => hasRole('agent'),
    isTenant: () => hasRole('tenant'),
    isAdmin: () => hasRole('admin'),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};