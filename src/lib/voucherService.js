import { supabase } from './supabase';

// ============================================
// VOUCHER OPERATIONS
// Matches web: lib/vouchers.js
// DB columns: id, agent_id, voucher_pool_id, voucher_code, qr_code_url, value, currency,
//   merchant_name, merchant_logo, merchant_category, description, expires_at,
//   subscription_id, plan_name, plan_tier, status (issued|viewed|redeemed|expired|cancelled),
//   issued_at, viewed_at, redeemed_at, source, giftpesa_id, created_at
// ============================================

/**
 * Get agent vouchers with optional filters
 */
export const getAgentVouchers = async (agentId, filters = {}) => {
    try {
        let query = supabase
            .from('agent_vouchers')
            .select('*')
            .eq('agent_id', agentId)
            .order('issued_at', { ascending: false });

        if (filters.status === 'active') {
            query = query
                .in('status', ['issued', 'viewed'])
                .gte('expires_at', new Date().toISOString());
        } else if (filters.status === 'redeemed') {
            query = query.eq('status', 'redeemed');
        } else if (filters.status === 'expired') {
            query = query
                .in('status', ['issued', 'viewed'])
                .lt('expires_at', new Date().toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching vouchers:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Redeem a voucher
 */
export const redeemVoucher = async (voucherId, agentId) => {
    try {
        // Get voucher details first
        const { data: voucher, error: fetchError } = await supabase
            .from('agent_vouchers')
            .select('*')
            .eq('id', voucherId)
            .eq('agent_id', agentId)
            .single();

        if (fetchError) throw fetchError;

        if (!voucher) {
            return { success: false, error: 'Voucher not found' };
        }

        if (voucher.status === 'redeemed') {
            return { success: false, error: 'Voucher already redeemed' };
        }

        const now = new Date();
        if (new Date(voucher.expires_at) < now) {
            return { success: false, error: 'Voucher has expired' };
        }

        // Mark as redeemed
        const { data, error } = await supabase
            .from('agent_vouchers')
            .update({
                status: 'redeemed',
                redeemed_at: now.toISOString()
            })
            .eq('id', voucherId)
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error) {
        console.error('Error redeeming voucher:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark a voucher as viewed
 */
export const markVoucherViewed = async (voucherId, agentId) => {
    try {
        const { error } = await supabase
            .from('agent_vouchers')
            .update({
                status: 'viewed',
                viewed_at: new Date().toISOString()
            })
            .eq('id', voucherId)
            .eq('agent_id', agentId)
            .eq('status', 'issued');

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error marking voucher viewed:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Apply a voucher code (manual entry)
 */
export const applyVoucherCode = async (agentId, code) => {
    try {
        const { data: voucher, error } = await supabase
            .from('agent_vouchers')
            .select('*')
            .eq('voucher_code', code.toUpperCase())
            .in('status', ['issued', 'viewed'])
            .gte('expires_at', new Date().toISOString())
            .single();

        if (error || !voucher) {
            return { success: false, error: 'Invalid or expired voucher code' };
        }

        // Check if voucher belongs to agent or is universal
        if (voucher.agent_id && voucher.agent_id !== agentId) {
            return { success: false, error: 'This voucher is not available for your account' };
        }

        return { success: true, data: voucher };
    } catch (error) {
        console.error('Error applying voucher code:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get voucher statistics for an agent
 */
export const getVoucherStats = async (agentId) => {
    try {
        const { data, error } = await supabase
            .from('agent_vouchers')
            .select('id, status, expires_at, value')
            .eq('agent_id', agentId);

        if (error) throw error;

        const now = new Date();
        const vouchers = data || [];
        const active = vouchers.filter(v => !['redeemed', 'expired', 'cancelled'].includes(v.status) && new Date(v.expires_at) > now);
        const redeemed = vouchers.filter(v => v.status === 'redeemed');
        const expired = vouchers.filter(v => !['redeemed', 'cancelled'].includes(v.status) && new Date(v.expires_at) <= now);
        const totalValue = vouchers.reduce((sum, v) => sum + (v.value || 0), 0);
        const redeemedValue = redeemed.reduce((sum, v) => sum + (v.value || 0), 0);

        return {
            success: true,
            data: {
                total: vouchers.length,
                active: active.length,
                redeemed: redeemed.length,
                expired: expired.length,
                totalValue,
                redeemedValue
            }
        };
    } catch (error) {
        console.error('Error fetching voucher stats:', error);
        return { success: false, error: error.message };
    }
};
