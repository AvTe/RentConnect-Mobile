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

/**
 * Update a support ticket
 * Matches web: updateTicket in ticket-service.js
 * @param {string} ticketId - Ticket UUID
 * @param {object} updates - Fields to update (status, priority, category)
 */
export const updateTicket = async (ticketId, updates) => {
    try {
        if (!ticketId) {
            return { success: false, error: 'Ticket ID is required' };
        }

        const updateData = {};

        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.subject !== undefined) updateData.subject = updates.subject;

        // Set resolved_at if status is resolved or closed
        if (updates.status === 'resolved' || updates.status === 'closed') {
            updateData.resolved_at = new Date().toISOString();
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating ticket:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe to real-time updates on a user's tickets
 * Matches web: subscribeToUserTickets in ticket-service.js
 * Fires callback whenever any of the user's tickets change (INSERT, UPDATE, DELETE)
 * @param {string} userId - User UUID
 * @param {function} callback - Called with updated ticket list
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserTickets = (userId, callback) => {
    // Fetch initial data
    const fetchTickets = async () => {
        const result = await getUserTickets(userId, {});
        if (result.success) {
            callback(result.data);
        }
    };

    fetchTickets();

    const channel = supabase
        .channel(`user-tickets-${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'support_tickets',
                filter: `user_id=eq.${userId}`
            },
            async () => {
                await fetchTickets();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Upload an attachment for a support ticket
 * Matches web: uploadTicketAttachment in ticket-service.js
 * Uses Supabase Storage bucket 'ticket-attachments'
 * @param {object} file - File object with { uri, name, type }
 * @param {string} ticketId - Ticket UUID
 * @returns {object} { success, url, path }
 */
export const uploadTicketAttachment = async (file, ticketId) => {
    try {
        if (!file || !ticketId) {
            return { success: false, error: 'File and ticket ID are required' };
        }

        const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
        const fileName = `${ticketId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // For React Native, we need to fetch the file URI and convert to blob
        const response = await fetch(file.uri);
        const blob = await response.blob();

        const { data, error } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, blob, {
                contentType: file.type || 'image/jpeg',
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(fileName);

        return { success: true, url: urlData.publicUrl, path: fileName };
    } catch (error) {
        console.error('Error uploading ticket attachment:', error);
        return { success: false, error: error.message };
    }
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
