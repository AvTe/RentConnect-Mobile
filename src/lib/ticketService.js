import { supabase } from './supabase';

// ============================================
// SUPPORT TICKET OPERATIONS
// Matches web: lib/ticket-service.js
// ============================================

/**
 * Create a new support ticket
 */
export const createTicket = async (ticketData) => {
    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .insert([{
                user_id: ticketData.userId,
                subject: ticketData.subject,
                message: ticketData.description,
                category: ticketData.category || 'general',
                priority: ticketData.priority || 'medium',
                status: 'open',
                attachments: ticketData.attachments || null
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error creating ticket:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get tickets for a user with optional filters
 */
export const getUserTickets = async (userId, filters = {}) => {
    try {
        let query = supabase
            .from('support_tickets')
            .select(`
                *,
                replies:ticket_replies(id)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.priority) {
            query = query.eq('priority', filters.priority);
        }

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Get a single ticket by ID with replies
 */
export const getTicketById = async (ticketId) => {
    try {
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketError) throw ticketError;

        const { data: replies, error: repliesError } = await supabase
            .from('ticket_replies')
            .select(`
                *,
                user:users!ticket_replies_user_id_fkey(id, name, avatar)
            `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        return {
            success: true,
            data: { ...ticket, replies: replies || [] }
        };
    } catch (error) {
        console.error('Error fetching ticket:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Add a reply to a ticket
 */
export const addTicketReply = async (ticketId, replyData) => {
    try {
        const { data, error } = await supabase
            .from('ticket_replies')
            .insert([{
                ticket_id: ticketId,
                user_id: replyData.userId,
                message: replyData.message,
                is_staff: replyData.isStaff || false,
                attachments: replyData.attachments || []
            }])
            .select(`
                *,
                user:users!ticket_replies_user_id_fkey(id, name, avatar)
            `)
            .single();

        if (error) throw error;

        // Update ticket updated_at
        await supabase
            .from('support_tickets')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        return { success: true, data };
    } catch (error) {
        console.error('Error adding reply:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe to real-time ticket reply updates
 */
export const subscribeToTicketReplies = (ticketId, callback) => {
    const channel = supabase
        .channel(`ticket-replies-${ticketId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'ticket_replies',
                filter: `ticket_id=eq.${ticketId}`
            },
            async (payload) => {
                callback(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Ticket categories matching web
export const TICKET_CATEGORIES = [
    { id: 'general', label: 'General', icon: 'help-circle' },
    { id: 'technical', label: 'Technical Issue', icon: 'settings' },
    { id: 'account', label: 'Account', icon: 'user' },
    { id: 'leads', label: 'Leads', icon: 'file-text' },
    { id: 'payments', label: 'Payments', icon: 'credit-card' },
    { id: 'verification', label: 'Verification', icon: 'check-circle' },
];

// Ticket priorities matching web
export const TICKET_PRIORITIES = [
    { id: 'low', label: 'Low', color: '#10B981' },
    { id: 'medium', label: 'Medium', color: '#F59E0B' },
    { id: 'high', label: 'High', color: '#EF4444' },
    { id: 'urgent', label: 'Urgent', color: '#DC2626' },
];
