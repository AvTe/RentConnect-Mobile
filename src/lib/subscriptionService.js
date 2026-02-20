import { supabase } from './supabase';

// ============================================
// SUBSCRIPTION & CREDIT PLANS OPERATIONS
// Matches web: lib/database.js subscription functions
// DB columns: id, user_id, plan_name, status, amount, currency,
//   payment_method, payment_reference, starts_at, expires_at, created_at, updated_at
// ============================================

/**
 * Get all subscription plans
 */
export const getAllSubscriptionPlans = async () => {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Get all credit bundles
 */
export const getAllCreditBundles = async () => {
    try {
        const { data, error } = await supabase
            .from('credit_bundles')
            .select('*')
            .eq('is_active', true)
            .order('price', { ascending: true });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching credit bundles:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Create a subscription for a user
 */
export const createSubscription = async (subscriptionData) => {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .insert([{
                user_id: subscriptionData.userId,
                plan_name: subscriptionData.planName,
                starts_at: new Date().toISOString(),
                expires_at: subscriptionData.expiresAt,
                status: 'active',
                payment_reference: subscriptionData.paymentReference || null,
                payment_method: subscriptionData.paymentMethod || 'mpesa',
                amount: subscriptionData.amount,
                currency: subscriptionData.currency || 'KES',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }])
            .select('*')
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error creating subscription:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get active subscription for a user
 */
export const getActiveSubscription = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check subscription status
 */
export const checkSubscriptionStatus = async (userId) => {
    try {
        const result = await getActiveSubscription(userId);

        if (!result.success) {
            return { isSubscribed: false, subscription: null };
        }

        if (!result.data) {
            return { isSubscribed: false, subscription: null };
        }

        const expiresAt = new Date(result.data.expires_at);
        const now = new Date();

        if (now >= expiresAt) {
            // Subscription expired, update status
            await supabase
                .from('subscriptions')
                .update({ status: 'expired', updated_at: new Date().toISOString() })
                .eq('id', result.data.id);
            return { isSubscribed: false, subscription: null };
        }

        const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        return {
            isSubscribed: true,
            subscription: result.data,
            daysRemaining,
            isExpiringSoon: daysRemaining <= 7,
        };
    } catch (error) {
        console.error('Error checking subscription:', error);
        return { isSubscribed: false, subscription: null };
    }
};

/**
 * Get subscription history for a user
 */
export const getSubscriptionHistory = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching subscription history:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (subscriptionId) => {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('id', subscriptionId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Update a subscription (general-purpose update)
 * Matches web: updateSubscription in lib/database.js
 * @param {string} subscriptionId - Subscription UUID
 * @param {object} updates - Fields to update (plan_name, status, amount, expires_at, etc.)
 */
export const updateSubscription = async (subscriptionId, updates) => {
    try {
        if (!subscriptionId) {
            return { success: false, error: 'Subscription ID is required' };
        }

        const { data, error } = await supabase
            .from('subscriptions')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
    }
};
