import { supabase } from './supabase';

// ============================================
// PRICING CONSTANTS
// ============================================
const SLOT_MULTIPLIERS = [1.0, 1.5, 2.5]; // Slot 1, 2, 3
const DEFAULT_BASE_PRICE = 250;

// ============================================
// PRICING UTILITIES
// ============================================

/**
 * Calculate unlock cost based on surge pricing
 */
export const calculateUnlockCost = (lead) => {
    const basePrice = lead.base_price || DEFAULT_BASE_PRICE;
    const currentSlot = lead.claimed_slots || 0;
    const multiplier = SLOT_MULTIPLIERS[currentSlot] || 2.5;
    return Math.round(basePrice * multiplier);
};

/**
 * Calculate exclusive buyout cost (15% discount on all slots)
 */
export const calculateExclusiveCost = (lead) => {
    const basePrice = lead.base_price || DEFAULT_BASE_PRICE;
    const totalMultiplier = 5.0; // 1.0 + 1.5 + 2.5
    const discount = 0.85;
    return Math.round(basePrice * totalMultiplier * discount);
};

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Get remaining time until lead expires
 */
export const getRemainingTime = (createdAt, expiresAt) => {
    const now = new Date();

    // If expires_at is set, use it
    if (expiresAt) {
        const expiry = new Date(expiresAt);
        if (expiry <= now) return "EXPIRED";

        const diff = expiry.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h`;
        return "< 1h";
    }

    // Default: 7 days from creation
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (expiry <= now) return "EXPIRED";

    const diff = expiry.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return "< 1h";
};

// ============================================
// LEAD STATE UTILITIES
// ============================================

export const LEAD_STATE_STYLES = {
    available: {
        slotColor: '#10B981',
        slotBg: '#ECFDF5',
        statusText: 'AVAILABLE',
        statusColor: '#10B981',
    },
    open: {
        slotColor: '#F59E0B',
        slotBg: '#FFFBEB',
        statusText: 'OPEN',
        statusColor: '#F59E0B',
    },
    sold_out: {
        slotColor: '#EF4444',
        slotBg: '#FEF2F2',
        statusText: 'SOLD OUT',
        statusColor: '#EF4444',
    },
    expired: {
        slotColor: '#6B7280',
        slotBg: '#F3F4F6',
        statusText: 'EXPIRED',
        statusColor: '#6B7280',
    },
    unlocked: {
        slotColor: '#10B981',
        slotBg: '#ECFDF5',
        statusText: 'UNLOCKED',
        statusColor: '#10B981',
    },
};

/**
 * Get lead state based on status and unlock status
 */
export const getLeadState = (lead, isUnlocked = false) => {
    const timeLeft = getRemainingTime(lead.created_at, lead.expires_at);
    const isExpired = timeLeft === "EXPIRED" || lead.status === 'expired';
    const maxSlots = lead.max_slots || 3;
    const claimedSlots = lead.claimed_slots || 0;
    const isSoldOut = lead.status === 'sold_out' || claimedSlots >= maxSlots;

    if (isUnlocked) return 'unlocked';
    if (isExpired) return 'expired';
    if (isSoldOut) return 'sold_out';
    if (claimedSlots > 0) return 'open';
    return 'available';
};

// ============================================
// LEAD API FUNCTIONS
// ============================================

/**
 * Fetch all leads for agents (with optional filters)
 */
export const fetchLeads = async (filters = {}) => {
    try {
        let query = supabase
            .from('leads')
            .select('*')
            .or('is_hidden.is.null,is_hidden.eq.false')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        if (filters.location) {
            query = query.ilike('location', `%${filters.location}%`);
        }
        if (filters.propertyType) {
            query = query.eq('property_type', filters.propertyType);
        }
        if (filters.minBudget) {
            query = query.gte('budget', filters.minBudget);
        }
        if (filters.maxBudget) {
            query = query.lte('budget', filters.maxBudget);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return { success: true, leads: data || [], count: count || data?.length || 0 };
    } catch (error) {
        console.error('Error fetching leads:', error);
        return { success: false, leads: [], count: 0, error: error.message };
    }
};

/**
 * Get agent's unlocked lead IDs
 */
export const getUnlockedLeadIds = async (agentId) => {
    try {
        const { data, error } = await supabase
            .from('contact_history')
            .select('lead_id')
            .eq('agent_id', agentId)
            .in('contact_type', ['unlock', 'exclusive']);

        if (error) throw error;

        // Filter unique lead IDs
        const leadIds = [...new Set(
            (data || [])
                .filter(item => item.lead_id)
                .map(item => item.lead_id)
        )];

        return { success: true, leadIds };
    } catch (error) {
        console.error('Error getting unlocked leads:', error);
        return { success: false, leadIds: [], error: error.message };
    }
};

/**
 * Check if agent has unlocked a specific lead
 */
export const hasAgentUnlockedLead = async (agentId, leadId) => {
    try {
        const { data, error } = await supabase
            .from('contact_history')
            .select('id')
            .eq('agent_id', agentId)
            .eq('lead_id', leadId)
            .in('contact_type', ['unlock', 'exclusive'])
            .limit(1);

        if (error) return false;
        return data && data.length > 0;
    } catch (error) {
        console.error('Error checking unlock status:', error);
        return false;
    }
};

/**
 * Add credits to user wallet
 */
export const addCredits = async (userId, amount, reason) => {
    try {
        // Input validation (matches web behavior)
        const parsedAmount = parseFloat(amount);
        if (!userId || isNaN(parsedAmount) || parsedAmount <= 0) {
            return { success: false, error: 'Invalid userId or amount' };
        }

        const { data: user, error: getUserError } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', userId)
            .single();

        if (getUserError) {
            return { success: false, error: 'Failed to get user balance' };
        }

        const currentBalance = parseFloat(user.wallet_balance || 0);
        const newBalance = currentBalance + amount;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                wallet_balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            return { success: false, error: 'Failed to update balance' };
        }

        // Record transaction
        await supabase.from('credit_transactions').insert({
            user_id: userId,
            amount,
            type: 'credit',
            reason,
            balance_after: newBalance,
            created_at: new Date().toISOString()
        });

        return { success: true, newBalance };
    } catch (error) {
        console.error('Error adding credits:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Deduct credits from user wallet
 */
export const deductCredits = async (userId, amount, reason) => {
    try {
        // Input validation
        const parsedAmount = parseFloat(amount);
        if (!userId || isNaN(parsedAmount) || parsedAmount <= 0) {
            return { success: false, error: 'Invalid userId or amount' };
        }

        const { data: user, error: getUserError } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('id', userId)
            .single();

        if (getUserError) {
            return { success: false, error: 'Failed to get user balance' };
        }

        const currentBalance = parseFloat(user.wallet_balance || 0);

        if (currentBalance < amount) {
            return { success: false, error: 'Insufficient credits' };
        }

        const newBalance = currentBalance - amount;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                wallet_balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            return { success: false, error: 'Failed to update balance' };
        }

        // Record transaction
        await supabase.from('credit_transactions').insert({
            user_id: userId,
            amount,
            type: 'debit',
            reason,
            balance_after: newBalance,
            created_at: new Date().toISOString()
        });

        return { success: true, newBalance };
    } catch (error) {
        console.error('Error deducting credits:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Unlock a lead (single slot or exclusive)
 */
export const unlockLead = async (agentId, leadId, isExclusive = false) => {
    try {
        // Step 1: Get lead details
        const { data: lead, error: fetchError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (fetchError || !lead) {
            return { success: false, error: 'Lead not found' };
        }

        // Step 2: Validations
        const maxSlots = lead.max_slots || 3;
        const claimedSlots = lead.claimed_slots || 0;

        if (lead.status === 'sold_out' || claimedSlots >= maxSlots) {
            return { success: false, error: 'Lead is already sold out' };
        }

        if (isExclusive && claimedSlots > 0) {
            return { success: false, error: 'Exclusive buyout only available for new leads' };
        }

        if (lead.is_exclusive) {
            return { success: false, error: 'This lead has been bought exclusively by another agent' };
        }

        // Check expiry
        const timeLeft = getRemainingTime(lead.created_at, lead.expires_at);
        if (timeLeft === "EXPIRED") {
            return { success: false, error: 'This lead has expired' };
        }

        // Step 3: Check if already unlocked
        const alreadyUnlocked = await hasAgentUnlockedLead(agentId, leadId);
        if (alreadyUnlocked) {
            return { success: true, message: 'Already unlocked' };
        }

        // Step 4: Calculate cost
        const cost = isExclusive ? calculateExclusiveCost(lead) : calculateUnlockCost(lead);

        // Step 5: Deduct credits
        const deductResult = await deductCredits(
            agentId,
            cost,
            `Lead Unlock: ${leadId}${isExclusive ? ' (Exclusive)' : ''}`
        );

        if (!deductResult.success) {
            return deductResult;
        }

        // Step 6: Update lead slots
        const newClaimedSlots = isExclusive ? maxSlots : claimedSlots + 1;

        const { error: updateError } = await supabase
            .from('leads')
            .update({
                claimed_slots: newClaimedSlots,
                status: newClaimedSlots >= maxSlots ? 'sold_out' : 'active',
                is_exclusive: isExclusive || lead.is_exclusive,
                contacts: (lead.contacts || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId);

        if (updateError) {
            // Refund on failure
            await addCredits(agentId, cost, 'Refund: Lead unlock failed');
            return { success: false, error: 'Failed to update lead' };
        }

        // Step 7: Log contact history
        const { error: contactError } = await supabase
            .from('contact_history')
            .insert({
                agent_id: agentId,
                lead_id: leadId,
                contact_type: isExclusive ? 'exclusive' : 'unlock',
                cost_credits: cost,
                created_at: new Date().toISOString()
            });

        if (contactError) {
            console.error('Error logging contact history:', contactError);
            // Refund if contact_history insert fails (matches web behavior)
            await addCredits(agentId, cost, 'Refund: Contact history logging failed');
            return { success: false, error: 'Failed to record unlock. Credits refunded.' };
        }

        // Step 8: Upsert lead_agent_connections (matches web unlockLead)
        const { error: connectionError } = await supabase
            .from('lead_agent_connections')
            .upsert({
                lead_id: leadId,
                agent_id: agentId,
                connection_type: isExclusive ? 'exclusive' : 'unlock',
                status: 'connected',
                cost: cost,
                is_exclusive: isExclusive,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'lead_id,agent_id' });

        if (connectionError) {
            // Non-fatal: log but don't fail the unlock
            console.error('Error upserting lead_agent_connections:', connectionError);
        }

        // Step 9: Create notifications (matches web unlockLead)
        // Notify agent: "Lead unlocked"
        try {
            await supabase.from('notifications').insert({
                user_id: agentId,
                type: 'lead_unlocked',
                title: 'Lead Unlocked!',
                message: `You've unlocked a lead in ${lead.location || 'unknown location'}. Contact the tenant now!`,
                data: { lead_id: leadId, cost },
                read: false,
                created_at: new Date().toISOString()
            });
        } catch (notifErr) {
            console.error('Error creating agent notification:', notifErr);
        }

        // Notify tenant: "An agent is interested"
        if (lead.user_id) {
            try {
                await supabase.from('notifications').insert({
                    user_id: lead.user_id,
                    type: 'agent_interested',
                    title: 'An agent is interested!',
                    message: 'A verified agent has unlocked your rental request and may contact you soon.',
                    data: { lead_id: leadId, agent_id: agentId },
                    read: false,
                    created_at: new Date().toISOString()
                });
            } catch (notifErr) {
                console.error('Error creating tenant notification:', notifErr);
            }
        }

        return { success: true, cost, lead };
    } catch (error) {
        console.error('Error unlocking lead:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Increment lead views (for analytics)
 * Uses contact_history with contact_type='browse' to match web behavior
 */
export const incrementLeadViews = async (leadId, agentId) => {
    try {
        // Check if agent already browsed this lead (via contact_history)
        const { data: existing } = await supabase
            .from('contact_history')
            .select('id')
            .eq('lead_id', leadId)
            .eq('agent_id', agentId)
            .eq('contact_type', 'browse')
            .limit(1);

        if (existing && existing.length > 0) return; // Already viewed

        // Log browse in contact_history (matches web incrementLeadViews)
        await supabase.from('contact_history').insert({
            agent_id: agentId,
            lead_id: leadId,
            contact_type: 'browse',
            cost_credits: 0,
            created_at: new Date().toISOString()
        });

        // Increment counter on lead
        const { data: leadData } = await supabase
            .from('leads')
            .select('views')
            .eq('id', leadId)
            .single();

        await supabase
            .from('leads')
            .update({
                views: (leadData?.views || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('id', leadId);
    } catch (error) {
        console.error('Error incrementing lead views:', error);
    }
};

/**
 * Get agent's unlocked leads with full lead details
 */
export const getAgentUnlockedLeads = async (agentId) => {
    try {
        const { data, error } = await supabase
            .from('contact_history')
            .select(`
                *,
                leads (*)
            `)
            .eq('agent_id', agentId)
            .in('contact_type', ['unlock', 'exclusive'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching unlocked leads:', error);
        return { success: false, data: [], error: error.message };
    }
};

/**
 * Get wallet transactions
 */
export const getWalletTransactions = async (userId, limit = 20) => {
    try {
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { success: true, transactions: data || [] };
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return { success: false, transactions: [], error: error.message };
    }
};

// ============================================
// LEAD CREATION (matches web createLead)
// ============================================

/**
 * Create a new lead with proper pricing & agent notifications.
 * Matches web: createLead in database.js
 */
export const createLead = async (leadData) => {
    try {
        // Calculate base_price from budget tier (matches web logic)
        let basePrice = 250; // Default: Standard
        const budget = parseFloat(leadData.budget || 0);
        if (budget < 12000) basePrice = 50;       // Student/Budget
        else if (budget > 60000) basePrice = 1000; // Premium
        else if (budget > 30000) basePrice = 450;  // Family/Mid

        const { data, error } = await supabase
            .from('leads')
            .insert({
                ...leadData,
                status: 'active',
                views: 0,
                contacts: 0,
                base_price: basePrice,
                max_slots: 3,
                claimed_slots: 0,
                is_exclusive: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;

        // --- NOTIFICATION LOGIC (matches web createLead) ---
        try {
            // Find all verified agents
            const { data: allAgents } = await supabase
                .from('users')
                .select('id, name, location')
                .eq('role', 'agent')
                .eq('verification_status', 'verified');

            if (allAgents && allAgents.length > 0) {
                const leadLoc = (leadData.location || '').toLowerCase();
                const leadType = leadData.property_type || 'property';

                // Filter agents where locations overlap (or generalist agents)
                const matchingAgents = allAgents.filter(agent => {
                    const agentLoc = (agent.location || '').toLowerCase();
                    if (!agentLoc || agentLoc === 'all' || agentLoc === 'global' || agentLoc === 'any') return true;
                    return leadLoc.includes(agentLoc) || agentLoc.includes(leadLoc);
                });

                if (matchingAgents.length > 0) {
                    // Create in-app notifications for each matching agent
                    const notifications = matchingAgents.map(agent => ({
                        user_id: agent.id,
                        type: 'new_lead',
                        title: 'New Lead Available!',
                        message: `A new tenant is looking for ${leadType} in ${leadData.location}`,
                        data: {
                            leadId: data.id,
                            location: leadData.location,
                            type: leadType,
                            budget: leadData.budget,
                        },
                        read: false,
                        created_at: new Date().toISOString(),
                    }));

                    await supabase.from('notifications').insert(notifications);
                }
            }
        } catch (notifErr) {
            console.error('Non-critical error sending lead notifications:', notifErr);
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error creating lead:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get a single lead by ID
 */
export const getLead = async (leadId) => {
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching lead:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get tenant's leads by email
 */
export const getTenantLeads = async (tenantEmail, options = {}) => {
    try {
        let query = supabase
            .from('leads')
            .select('*')
            .eq('tenant_email', tenantEmail)
            .order('created_at', { ascending: false });

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching tenant leads:', error);
        return { success: false, data: [], error: error.message };
    }
};

/**
 * Update a lead's status
 */
export const updateLeadStatus = async (leadId, status) => {
    try {
        const { error } = await supabase
            .from('leads')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', leadId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating lead status:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a lead
 */
export const deleteLead = async (leadId) => {
    try {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting lead:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Add credits to agent wallet with notification (matches web addAgentCredits).
 * Wraps addCredits() and sends a purchase notification.
 */
export const addAgentCredits = async (agentId, credits, transactionData = {}) => {
    const reason = `Credit purchase via ${transactionData.paymentMethod || 'Payment'} - ${transactionData.confirmationCode || ''}`;
    const result = await addCredits(agentId, credits, reason);

    if (result.success) {
        // Send in-app notification on credit purchase
        try {
            await supabase.from('notifications').insert({
                user_id: agentId,
                type: 'credits_purchased',
                title: 'Credits Added!',
                message: `${credits} credits have been added to your wallet. New balance: ${result.newBalance} credits.`,
                data: {
                    credits,
                    amount: transactionData.amount || 0,
                    newBalance: result.newBalance,
                    transactionId: transactionData.confirmationCode || transactionData.transactionId,
                },
                read: false,
                created_at: new Date().toISOString(),
            });
        } catch (notifError) {
            console.error('Non-critical notification error:', notifError);
        }
    }

    return result;
};

/**
 * Subscribe to real-time lead updates
 * Matches web: subscribeToLeads in database.js
 */
export const subscribeToLeads = (filters = {}, callback) => {
    const channel = supabase
        .channel('leads-realtime')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'leads'
            },
            (payload) => {
                callback(payload);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
