import { supabase } from './supabase';
import { logger } from './logger';

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Transform database row from snake_case to camelCase
 */
const transformUserData = (user) => {
    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role || user.type,
        type: user.type || user.role,
        location: user.location,
        city: user.city,
        // Agent-specific fields
        agencyName: user.agency_name,
        experience: user.experience,
        bio: user.bio,
        specialties: user.specialties || [],
        licenseNumber: user.license_number,
        // Verification
        verificationStatus: user.verification_status || 'pending',
        verifiedAt: user.verified_at,
        // Wallet
        walletBalance: parseFloat(user.wallet_balance || 0),
        // Referral
        referralCode: user.referral_code,
        referredBy: user.referred_by,
        // Timestamps
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        // Keep original for compatibility
        ...user
    };
};

/**
 * Generate a unique referral code starting with YOOM
 */
const generateReferralCode = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (attempts < MAX_ATTEMPTS) {
        let code = 'YOOM';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if code already exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('referral_code', code)
            .maybeSingle();

        if (!existing) {
            return code;
        }
        attempts++;
    }

    // Fallback
    return 'YOOM' + Date.now().toString(36).toUpperCase().slice(-6);
};

/**
 * Get user by ID
 */
export const getUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { success: true, data: transformUserData(data) };
    } catch (error) {
        console.error('Error fetching user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Create new user profile
 */
export const createUser = async (userId, userData) => {
    try {
        // Ensure name is a string
        const nameStr = typeof userData.name === 'string'
            ? userData.name
            : (userData.email?.split('@')[0] || 'User');

        // Generate unique referral code
        const referralCode = await generateReferralCode();

        // Determine role/type
        const userType = userData.type || userData.user_type || 'tenant';

        const { error } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: userData.email,
                name: nameStr,
                phone: userData.phone || null,
                role: userType,
                type: userType,
                wallet_balance: 0,
                referral_code: referralCode,
                verification_status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        logger.log('[CreateUser] User created successfully:', userId);

        // Process referral if provided
        if (userData.referredBy || userData.referred_by) {
            const referralCode = userData.referredBy || userData.referred_by;
            logger.log('[CreateUser] Referral code provided:', referralCode);
            await processReferral(userId, referralCode);
        }

        return { success: true };
    } catch (error) {
        console.error('[CreateUser] Error creating user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update user profile
 */
export const updateUser = async (userId, updates) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data: transformUserData(data) };
    } catch (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if phone number already exists
 */
export const checkPhoneNumberExists = async (phoneNumber) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('phone', phoneNumber)
            .limit(1);

        if (error) throw error;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking phone number:', error);
        return false;
    }
};

/**
 * Process referral code - Awards credits on signup
 */
export const processReferral = async (newUserId, referralCode) => {
    logger.log('[Referral] Processing referral:', { newUserId, referralCode });

    try {
        if (!newUserId || !referralCode) {
            return { success: false, error: 'Missing user ID or referral code' };
        }

        const normalizedCode = referralCode.trim().toUpperCase();

        // Find referrer by referral code
        const { data: referrer, error: findError } = await supabase
            .from('users')
            .select('id, name, wallet_balance')
            .eq('referral_code', normalizedCode)
            .maybeSingle();

        if (findError || !referrer) {
            logger.log('[Referral] No referrer found with code:', normalizedCode);
            return { success: false, error: 'Invalid referral code' };
        }

        const referrerId = referrer.id;

        // Prevent self-referral
        if (referrerId === newUserId) {
            return { success: false, error: 'You cannot refer yourself.' };
        }

        // Check if already referred
        const { data: existingReferral } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_user_id', newUserId)
            .maybeSingle();

        if (existingReferral) {
            return { success: false, error: 'You have already been referred.' };
        }

        const REFERRER_BONUS = 5;
        const NEW_USER_BONUS = 2;

        // Award credits to referrer
        await supabase
            .from('users')
            .update({
                wallet_balance: (parseFloat(referrer.wallet_balance) || 0) + REFERRER_BONUS,
                updated_at: new Date().toISOString()
            })
            .eq('id', referrerId);

        // Award welcome bonus to new user
        const { data: newUser } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', newUserId)
            .maybeSingle();

        if (newUser) {
            await supabase
                .from('users')
                .update({
                    wallet_balance: (parseFloat(newUser.wallet_balance) || 0) + NEW_USER_BONUS,
                    updated_at: new Date().toISOString()
                })
                .eq('id', newUserId);
        }

        // Record referral
        await supabase.from('referrals').insert({
            referrer_id: referrerId,
            referred_user_id: newUserId,
            credits_awarded: REFERRER_BONUS,
            bonus_amount: REFERRER_BONUS,
            status: 'completed',
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        });

        logger.log('[Referral] Successfully processed referral');
        return { success: true, referrerName: referrer.name };
    } catch (error) {
        console.error('[Referral] Error:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// WALLET OPERATIONS
// ============================================

/**
 * Get wallet balance
 */
export const getWalletBalance = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { success: true, balance: parseFloat(data?.wallet_balance || 0) };
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        return { success: false, balance: 0, error: error.message };
    }
};

/**
 * Get referral stats for user
 */
export const getReferralStats = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', userId);

        if (error) throw error;

        const stats = {
            total: data?.length || 0,
            pending: data?.filter(r => r.status === 'pending').length || 0,
            completed: data?.filter(r => r.status === 'completed').length || 0,
            creditsEarned: data?.reduce((sum, r) => sum + (r.credits_awarded || 0), 0) || 0
        };

        return { success: true, stats };
    } catch (error) {
        console.error('Error fetching referral stats:', error);
        return { success: false, stats: { total: 0, pending: 0, completed: 0, creditsEarned: 0 } };
    }
};

/**
 * Get user's referral code
 */
export const getReferralCode = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('referral_code')
            .eq('id', userId)
            .single();

        if (error) throw error;

        if (data?.referral_code) {
            return { success: true, code: data.referral_code };
        }

        // Generate new code if doesn't exist
        const newCode = await generateReferralCode();
        await supabase
            .from('users')
            .update({ referral_code: newCode, updated_at: new Date().toISOString() })
            .eq('id', userId);

        return { success: true, code: newCode };
    } catch (error) {
        console.error('Error getting referral code:', error);
        return { success: false, error: error.message };
    }
};
