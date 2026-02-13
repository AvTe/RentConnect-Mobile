import React, { createContext, useContext, useEffect, useState } from 'react';
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

        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUserData(null);
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
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
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
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
   * Send password reset email
   */
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        { redirectTo: 'yoombaa://reset-password' }
      );

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
        message: 'If an account exists with this email, you will receive a password reset link.'
      };
    } catch (error) {
      console.error('Error sending reset email:', error);
      return { success: false, error: 'Failed to send reset email. Please try again.' };
    }
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
    // Auth methods
    signIn,
    signUp,
    signOut,
    resetPassword,
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