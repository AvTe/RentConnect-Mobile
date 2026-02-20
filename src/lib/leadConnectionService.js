import { supabase } from './supabase';

// ============================================
// LEAD CONNECTION OPERATIONS
// Matches web: database.js lead_agent_connections CRUD
// Table: lead_agent_connections (agent-lead relationships, pipeline, outcomes)
// ============================================

/**
 * Check if an agent is connected to a lead (via unlock/exclusive).
 * Checks contact_history first (primary source of truth), then lead_agent_connections.
 * Matches web: checkAgentLeadConnection() in database.js
 *
 * @param {string} leadId
 * @param {string} agentId
 * @returns {Promise<{ success: boolean, connected: boolean }>}
 */
export const checkAgentLeadConnection = async (leadId, agentId) => {
    try {
        if (!leadId || !agentId) return { success: true, connected: false };

        // 1. Check contact_history first (primary source of truth for unlocks)
        const { data: history, error: historyError } = await supabase
            .from('contact_history')
            .select('id, contact_type')
            .eq('lead_id', leadId)
            .eq('agent_id', agentId)
            .in('contact_type', ['unlock', 'exclusive'])
            .limit(1);

        if (!historyError && history && history.length > 0) {
            return { success: true, connected: true };
        }

        // 2. Fallback: check lead_agent_connections table
        try {
            const { data, error } = await supabase
                .from('lead_agent_connections')
                .select('id')
                .eq('lead_id', leadId)
                .eq('agent_id', agentId)
                .maybeSingle();

            if (!error && data) {
                return { success: true, connected: true };
            }
        } catch (connErr) {
            // Table might not exist — already checked contact_history above
            console.log('lead_agent_connections check failed, using contact_history only');
        }

        return { success: true, connected: false };
    } catch (error) {
        console.error('Error checking agent-lead connection:', error);
        // Return false rather than error to not block UI
        return { success: true, connected: false };
    }
};

/**
 * Agent accepts/confirms interest in a lead.
 * Creates or updates a connection in lead_agent_connections.
 * Sends a notification to the tenant.
 * Matches web: acceptLead() in database.js
 *
 * @param {string} leadId
 * @param {string} agentId
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export const acceptLead = async (leadId, agentId) => {
    try {
        // Check if connection already exists
        const { data: existing } = await supabase
            .from('lead_agent_connections')
            .select('id, status')
            .eq('lead_id', leadId)
            .eq('agent_id', agentId)
            .maybeSingle();

        let connectionData;

        if (existing) {
            // Update existing connection
            const { data, error } = await supabase
                .from('lead_agent_connections')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            connectionData = data;
        } else {
            // Create new connection
            const { data, error } = await supabase
                .from('lead_agent_connections')
                .insert({
                    lead_id: leadId,
                    agent_id: agentId,
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            connectionData = data;
        }

        // Send notification to the tenant
        try {
            const [leadRes, agentRes] = await Promise.all([
                supabase.from('leads').select('user_id, location').eq('id', leadId).single(),
                supabase.from('users').select('name').eq('id', agentId).single(),
            ]);

            const lead = leadRes.data;
            const agent = agentRes.data;

            if (lead?.user_id && agent?.name) {
                await supabase.from('notifications').insert({
                    user_id: lead.user_id,
                    type: 'agent_interested',
                    title: 'An Agent is Interested! ✨',
                    message: `${agent.name} is interested in your rental request in ${lead.location}.`,
                    data: { leadId, agentName: agent.name },
                    read: false,
                    created_at: new Date().toISOString(),
                });
            }
        } catch (notifError) {
            console.error('Non-critical notification error:', notifError);
        }

        return { success: true, data: connectionData };
    } catch (error) {
        console.error('Error accepting lead:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Record that an agent has contacted a tenant for a lead.
 * Updates the connection status to 'contacted' with contact timestamps.
 * Matches web: recordLeadContact() in database.js
 *
 * @param {string} leadId
 * @param {string} agentId
 * @param {string} [notes=''] - Optional agent notes about the contact
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export const recordLeadContact = async (leadId, agentId, notes = '') => {
    try {
        const { data, error } = await supabase
            .from('lead_agent_connections')
            .update({
                status: 'contacted',
                first_contact_at: new Date().toISOString(),
                last_contact_at: new Date().toISOString(),
                contact_count: 1,
                agent_notes: notes,
                updated_at: new Date().toISOString(),
            })
            .eq('lead_id', leadId)
            .eq('agent_id', agentId)
            .eq('status', 'accepted')
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error recording lead contact:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get all agents connected to a specific lead.
 * Merges data from lead_agent_connections + contact_history, deduplicates by agent_id.
 * Matches web: getLeadConnections() in database.js
 *
 * @param {string} leadId
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
export const getLeadConnections = async (leadId) => {
    try {
        // 1. Get connections from lead_agent_connections with agent details
        const { data: connectionData, error: connectionError } = await supabase
            .from('lead_agent_connections')
            .select(`
                *,
                agent:agent_id (
                    id, name, email, phone, avatar, agency_name, verification_status
                )
            `)
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        // 2. Get contact_history entries for agents who unlocked this lead
        const { data: historyData, error: historyError } = await supabase
            .from('contact_history')
            .select(`
                id,
                agent_id,
                lead_id,
                contact_type,
                cost_credits,
                created_at
            `)
            .eq('lead_id', leadId)
            .in('contact_type', ['unlock', 'exclusive'])
            .order('created_at', { ascending: false });

        // 3. Merge both data sources, dedup by agent_id
        const agentMap = new Map();

        // From lead_agent_connections (richer data)
        (connectionData || []).forEach(conn => {
            if (conn.agent_id && !agentMap.has(conn.agent_id)) {
                agentMap.set(conn.agent_id, {
                    ...conn,
                    source: 'connection',
                    unlockCost: conn.cost || 0,
                });
            }
        });

        // From contact_history (fallback for agents not in connections table)
        (historyData || []).forEach(hist => {
            if (hist.agent_id && !agentMap.has(hist.agent_id)) {
                agentMap.set(hist.agent_id, {
                    id: hist.id,
                    agent_id: hist.agent_id,
                    lead_id: hist.lead_id,
                    created_at: hist.created_at,
                    contact_type: hist.contact_type,
                    unlockCost: hist.cost_credits || 0,
                    is_exclusive: hist.contact_type === 'exclusive',
                    source: 'history',
                });
            }
        });

        return { success: true, data: Array.from(agentMap.values()) };
    } catch (error) {
        console.error('Error getting lead connections:', error);
        return { success: false, data: [], error: error.message };
    }
};

/**
 * Get all leads an agent is connected to (their lead pipeline).
 * Queries contact_history for actual unlocks, joins lead details, deduplicates by lead_id.
 * Matches web: getAgentConnectedLeads() in database.js
 *
 * @param {string} agentId
 * @param {Object} [filters={}] - Reserved for future filter support
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
export const getAgentConnectedLeads = async (agentId, filters = {}) => {
    try {
        // Get unlock/exclusive entries from contact_history with lead details
        const { data, error } = await supabase
            .from('contact_history')
            .select(`
                id,
                lead_id,
                contact_type,
                cost_credits,
                created_at,
                lead:leads (
                    id,
                    tenant_name,
                    tenant_email,
                    tenant_phone,
                    location,
                    property_type,
                    budget,
                    bedrooms,
                    status,
                    created_at,
                    requirements,
                    contacts
                )
            `)
            .eq('agent_id', agentId)
            .in('contact_type', ['unlock', 'exclusive'])
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Deduplicate by lead_id (agent may have multiple events for same lead)
        const uniqueLeads = [];
        const seenLeadIds = new Set();

        for (const item of (data || [])) {
            if (item.lead_id && !seenLeadIds.has(item.lead_id)) {
                seenLeadIds.add(item.lead_id);
                uniqueLeads.push({
                    ...item,
                    status: item.contact_type || 'contacted',
                });
            }
        }

        return { success: true, data: uniqueLeads };
    } catch (error) {
        console.error('Error getting agent connected leads:', error);
        return { success: false, data: [], error: error.message };
    }
};

/**
 * Update the outcome of a lead connection (converted, lost, etc.).
 * Matches web: updateLeadOutcome() in database.js
 *
 * @param {string} connectionId - UUID of the lead_agent_connections row
 * @param {string} outcome - 'converted' | 'lost'
 * @param {string} [notes=''] - Optional outcome notes
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export const updateLeadOutcome = async (connectionId, outcome, notes = '') => {
    try {
        const { data, error } = await supabase
            .from('lead_agent_connections')
            .update({
                status: outcome === 'converted' ? 'converted' : 'lost',
                outcome,
                outcome_notes: notes,
                updated_at: new Date().toISOString(),
            })
            .eq('id', connectionId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating lead outcome:', error);
        return { success: false, error: error.message };
    }
};
