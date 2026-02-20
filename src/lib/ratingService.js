import { supabase } from './supabase';

// ============================================
// AGENT RATING OPERATIONS
// Matches web: lib/database.js rating functions
// ============================================

/**
 * Submit rating for an agent
 */
export const submitAgentRating = async (ratingData) => {
    try {
        const { data, error } = await supabase
            .from('agent_ratings')
            .insert([{
                agent_id: ratingData.agentId,
                tenant_id: ratingData.tenantId,
                lead_id: ratingData.leadId,
                rating: ratingData.rating,
                review: ratingData.review || '',
                categories: ratingData.categories || {}
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error submitting rating:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check if tenant can rate an agent (must have connected through a lead)
 */
export const canTenantRateAgent = async (tenantId, agentId, leadId) => {
    try {
        // Check if connection exists
        const { data: connection, error: connError } = await supabase
            .from('lead_agent_connections')
            .select('id')
            .eq('agent_id', agentId)
            .eq('lead_id', leadId)
            .single();

        if (connError || !connection) {
            return { canRate: false, reason: 'No connection found' };
        }

        // Check if already rated
        const { data: existingRating, error: ratingError } = await supabase
            .from('agent_ratings')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('agent_id', agentId)
            .eq('lead_id', leadId)
            .single();

        if (existingRating) {
            return { canRate: false, reason: 'Already rated' };
        }

        return { canRate: true };
    } catch (error) {
        console.error('Error checking rate eligibility:', error);
        return { canRate: false, reason: error.message };
    }
};

/**
 * Get ratings for an agent
 */
export const getAgentRatings = async (agentId, page = 0, limit = 10) => {
    try {
        const from = page * limit;
        const to = from + limit - 1;

        const { data, error, count } = await supabase
            .from('agent_ratings')
            .select(`
                *,
                tenant:users!agent_ratings_tenant_id_fkey(id, name, avatar)
            `, { count: 'exact' })
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;
        return {
            success: true,
            data: data || [],
            total: count || 0,
            hasMore: (from + limit) < (count || 0)
        };
    } catch (error) {
        console.error('Error fetching ratings:', error);
        return { success: false, error: error.message, data: [], total: 0 };
    }
};

/**
 * Get agent rating summary (average, count, distribution)
 */
export const getAgentRatingSummary = async (agentId) => {
    try {
        const { data, error } = await supabase
            .from('agent_ratings')
            .select('rating')
            .eq('agent_id', agentId);

        if (error) throw error;

        if (!data || data.length === 0) {
            return {
                success: true,
                data: {
                    average: 0,
                    count: 0,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            };
        }

        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        const average = sum / data.length;
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        data.forEach(r => {
            const rounded = Math.round(r.rating);
            if (distribution[rounded] !== undefined) {
                distribution[rounded]++;
            }
        });

        return {
            success: true,
            data: {
                average: Math.round(average * 10) / 10,
                count: data.length,
                distribution
            }
        };
    } catch (error) {
        console.error('Error fetching rating summary:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get agents pending rating by a tenant
 */
export const getAgentsPendingRating = async (tenantId) => {
    try {
        // Get leads for this tenant that have agent connections
        const { data: leads, error: leadError } = await supabase
            .from('leads')
            .select('id')
            .eq('user_id', tenantId);

        if (leadError) throw leadError;
        if (!leads || leads.length === 0) return { success: true, data: [] };

        const leadIds = leads.map(l => l.id);

        // Get connections for these leads
        const { data: connections, error: connError } = await supabase
            .from('lead_agent_connections')
            .select(`
                id,
                agent_id,
                lead_id,
                agent:users!lead_agent_connections_agent_id_fkey(id, name, avatar, phone)
            `)
            .in('lead_id', leadIds);

        if (connError) throw connError;
        if (!connections || connections.length === 0) return { success: true, data: [] };

        // Get existing ratings
        const { data: ratings, error: ratingError } = await supabase
            .from('agent_ratings')
            .select('agent_id, lead_id')
            .eq('tenant_id', tenantId);

        if (ratingError) throw ratingError;

        const ratedSet = new Set(
            (ratings || []).map(r => `${r.agent_id}_${r.lead_id}`)
        );

        // Filter to unrated connections
        const pendingRatings = connections.filter(
            c => !ratedSet.has(`${c.agent_id}_${c.lead_id}`)
        );

        return { success: true, data: pendingRatings };
    } catch (error) {
        console.error('Error fetching pending ratings:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Update an agent rating (only the rating owner can update)
 * Matches web: updateAgentRating in database.js
 * @param {string} ratingId - Rating UUID
 * @param {string} tenantId - Tenant UUID (for ownership check)
 * @param {object} updates - Fields to update (rating, reviewText, category ratings)
 */
export const updateAgentRating = async (ratingId, tenantId, updates) => {
    try {
        if (!ratingId || !tenantId) {
            return { success: false, error: 'Rating ID and tenant ID are required' };
        }

        const updateData = {};

        if (updates.rating !== undefined) {
            if (updates.rating < 1 || updates.rating > 5) {
                return { success: false, error: 'Rating must be between 1 and 5' };
            }
            updateData.rating = updates.rating;
        }
        if (updates.reviewText !== undefined) updateData.review_text = updates.reviewText;
        if (updates.review !== undefined) updateData.review = updates.review;
        if (updates.responsivenessRating !== undefined) updateData.responsiveness_rating = updates.responsivenessRating;
        if (updates.professionalismRating !== undefined) updateData.professionalism_rating = updates.professionalismRating;
        if (updates.helpfulnessRating !== undefined) updateData.helpfulness_rating = updates.helpfulnessRating;
        if (updates.categories !== undefined) updateData.categories = updates.categories;

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('agent_ratings')
            .update(updateData)
            .eq('id', ratingId)
            .eq('tenant_id', tenantId) // Ensure only the owner can update
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return { success: false, error: 'Rating not found or you do not have permission to update it' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error updating agent rating:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete (soft-delete) an agent rating
 * Matches web: deleteAgentRating in database.js
 * Sets status to 'removed' rather than hard deleting
 * @param {string} ratingId - Rating UUID
 * @param {string} userId - User UUID (tenant or admin)
 */
export const deleteAgentRating = async (ratingId, userId) => {
    try {
        if (!ratingId || !userId) {
            return { success: false, error: 'Rating ID and user ID are required' };
        }

        // Check if user is admin or the tenant who created the rating
        const { data: user } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        const isAdmin = ['admin', 'super_admin', 'main_admin'].includes(user?.role);

        let query = supabase
            .from('agent_ratings')
            .update({ status: 'removed', updated_at: new Date().toISOString() })
            .eq('id', ratingId);

        // If not admin, only allow owner to delete
        if (!isAdmin) {
            query = query.eq('tenant_id', userId);
        }

        const { data, error } = await query.select().single();

        if (error) throw error;

        if (!data) {
            return { success: false, error: 'Rating not found or you do not have permission to delete it' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting agent rating:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Flag an agent rating as inappropriate
 * Matches web: flagAgentRating in database.js
 * @param {string} ratingId - Rating UUID
 * @param {string} reason - Reason for flagging
 */
export const flagAgentRating = async (ratingId, reason) => {
    try {
        if (!ratingId) {
            return { success: false, error: 'Rating ID is required' };
        }

        const { error } = await supabase
            .from('agent_ratings')
            .update({
                status: 'flagged',
                flag_reason: reason || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', ratingId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error flagging rating:', error);
        return { success: false, error: error.message };
    }
};

// Rating categories matching web
export const RATING_CATEGORIES = [
    { id: 'communication', label: 'Communication', icon: 'message-circle' },
    { id: 'professionalism', label: 'Professionalism', icon: 'briefcase' },
    { id: 'responsiveness', label: 'Responsiveness', icon: 'clock' },
    { id: 'knowledge', label: 'Knowledge', icon: 'book' },
    { id: 'value', label: 'Value for Money', icon: 'dollar-sign' },
];
