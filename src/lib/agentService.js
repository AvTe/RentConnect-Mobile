import { supabase } from './supabase';

// ============================================
// AGENT BROWSE & BAD LEAD REPORT OPERATIONS
// Matches web: lib/database.js agent/lead functions
// ============================================

/**
 * Get all agents with optional filters
 */
export const getAllAgents = async (filters = {}) => {
    try {
        let query = supabase
            .from('users')
            .select('*')
            .eq('role', 'agent')
            .order('created_at', { ascending: false });

        if (filters.city) {
            query = query.ilike('city', `%${filters.city}%`);
        }
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching agents:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Get agent by ID with full profile
 */
export const getAgentById = async (agentId) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', agentId)
            .eq('role', 'agent')
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching agent:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Search agents by name or city
 */
export const searchAgents = async (searchTerm, filters = {}) => {
    try {
        let query = supabase
            .from('users')
            .select('*')
            .eq('role', 'agent');

        if (searchTerm) {
            query = query.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,agency_name.ilike.%${searchTerm}%`);
        }

        if (filters.city) {
            query = query.ilike('city', `%${filters.city}%`);
        }

        query = query.order('created_at', { ascending: false }).limit(filters.limit || 20);

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error searching agents:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Send a connection request to an agent
 */
export const sendConnectionRequest = async (tenantId, agentId, leadId) => {
    try {
        const { data, error } = await supabase
            .from('contact_history')
            .insert([{
                user_id: tenantId,
                agent_id: agentId,
                lead_id: leadId,
                contact_type: 'connection_request',
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error sending connection request:', error);
        return { success: false, error: error.message };
    }
};

// ============================================
// BAD LEAD REPORT OPERATIONS
// ============================================

/**
 * Report a bad lead
 */
export const reportBadLead = async (reportData) => {
    try {
        const { data, error } = await supabase
            .from('bad_lead_reports')
            .insert([{
                lead_id: reportData.leadId,
                agent_id: reportData.agentId,
                reason: reportData.reason,
                description: reportData.description || '',
                evidence: reportData.evidence || [],
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error reporting bad lead:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get bad lead reports for an agent
 */
export const getAgentBadLeadReports = async (agentId) => {
    try {
        const { data, error } = await supabase
            .from('bad_lead_reports')
            .select(`
                *,
                lead:leads(id, name, phone, property_type, location)
            `)
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching bad lead reports:', error);
        return { success: false, error: error.message, data: [] };
    }
};

// Bad lead report reasons matching web
export const BAD_LEAD_REASONS = [
    { id: 'wrong_number', label: 'Wrong Phone Number', icon: 'phone-off' },
    { id: 'not_interested', label: 'Not Interested', icon: 'x-circle' },
    { id: 'fake_info', label: 'Fake Information', icon: 'alert-triangle' },
    { id: 'duplicate', label: 'Duplicate Lead', icon: 'copy' },
    { id: 'unreachable', label: 'Unreachable', icon: 'phone-missed' },
    { id: 'other', label: 'Other', icon: 'more-horizontal' },
];

// Agent specializations matching web
export const AGENT_SPECIALIZATIONS = [
    'Residential',
    'Commercial',
    'Land',
    'Rental',
    'Property Management',
    'Luxury',
    'Student Housing',
];
