import { supabase } from './supabase';

/**
 * Create an in-app notification
 */
export const createNotification = async (notificationData) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                ...notificationData,
                read: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, includeRead = true) => {
    try {
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId);

        if (!includeRead) {
            query = query.eq('read', false);
        }

        query = query.order('created_at', { ascending: false }).limit(50);

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error getting notifications:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Mark a single notification as read
 */
export const markNotificationRead = async (notificationId) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsRead = async (userId) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get unread notification count
 */
export const getUnreadNotificationCount = async (userId) => {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) throw error;
        return { success: true, count: count || 0 };
    } catch (error) {
        console.error('Error getting notification count:', error);
        return { success: false, count: 0, error: error.message };
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Subscribe to real-time notifications for a user.
 * Returns an unsubscribe function.
 */
export const subscribeToNotifications = (userId, callback) => {
    const fetchNotifs = async () => {
        const result = await getUserNotifications(userId, true);
        if (result.success) {
            callback(result.data);
        }
    };

    // Initial fetch
    fetchNotifs();

    const channel = supabase
        .channel(`notifications-${userId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            },
            async () => {
                await fetchNotifs();
            }
        )
        .subscribe();

    // Return cleanup function
    return () => {
        supabase.removeChannel(channel);
    };
};
