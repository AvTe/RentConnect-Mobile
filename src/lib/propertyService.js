import { supabase } from './supabase';

// ============================================
// PROPERTY OPERATIONS
// Matches web: lib/assets.js
// ============================================

/**
 * Create a new property listing
 */
export const createProperty = async (propertyData) => {
    try {
        const { data, error } = await supabase
            .from('properties')
            .insert([{
                agent_id: propertyData.agentId,
                title: propertyData.title,
                description: propertyData.description,
                property_type: propertyData.propertyType,
                price: propertyData.price,
                bedrooms: propertyData.bedrooms,
                bathrooms: propertyData.bathrooms,
                location: propertyData.location || propertyData.address,
                amenities: propertyData.amenities || [],
                images: propertyData.images || [],
                status: 'active'
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error creating property:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get properties for an agent
 */
export const getAgentProperties = async (agentId, filters = {}) => {
    try {
        let query = supabase
            .from('properties')
            .select('*')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.propertyType) {
            query = query.eq('property_type', filters.propertyType);
        }

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching agent properties:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Update a property
 */
export const updateProperty = async (propertyId, updates) => {
    try {
        const { data, error } = await supabase
            .from('properties')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', propertyId)
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating property:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a property (soft delete by status change)
 */
export const deleteProperty = async (propertyId) => {
    try {
        const { error } = await supabase
            .from('properties')
            .update({
                status: 'deleted',
                updated_at: new Date().toISOString()
            })
            .eq('id', propertyId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting property:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Search properties with filters (for tenants)
 */
export const searchProperties = async (filters = {}) => {
    try {
        let query = supabase
            .from('properties')
            .select(`
                *,
                agent:users!properties_agent_id_fkey(id, name, avatar, phone)
            `)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (filters.location) {
            query = query.ilike('location', `%${filters.location}%`);
        }
        if (filters.propertyType) {
            query = query.eq('property_type', filters.propertyType);
        }
        if (filters.minPrice) {
            query = query.gte('price', filters.minPrice);
        }
        if (filters.maxPrice) {
            query = query.lte('price', filters.maxPrice);
        }
        if (filters.bedrooms) {
            query = query.eq('bedrooms', filters.bedrooms);
        }
        if (filters.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error searching properties:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Save a property (tenant wish-list)
 */
export const saveProperty = async (userId, propertyId) => {
    try {
        const { data, error } = await supabase
            .from('saved_properties')
            .insert([{
                user_id: userId,
                property_id: propertyId
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error saving property:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Unsave a property
 */
export const unsaveProperty = async (userId, propertyId) => {
    try {
        const { error } = await supabase
            .from('saved_properties')
            .delete()
            .eq('user_id', userId)
            .eq('property_id', propertyId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error unsaving property:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get saved properties for a user
 */
export const getSavedProperties = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('saved_properties')
            .select(`
                id,
                property_id,
                created_at,
                property:properties(
                    *,
                    agent:users!properties_agent_id_fkey(id, name, avatar)
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error fetching saved properties:', error);
        return { success: false, error: error.message, data: [] };
    }
};

/**
 * Get property by ID
 */
export const getPropertyById = async (propertyId) => {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select(`
                *,
                agent:users!properties_agent_id_fkey(id, name, avatar, phone, email)
            `)
            .eq('id', propertyId)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching property:', error);
        return { success: false, error: error.message };
    }
};

// Property type options matching web
export const PROPERTY_TYPES = [
    { id: 'apartment', label: 'Apartment', icon: 'home' },
    { id: 'house', label: 'House', icon: 'home' },
    { id: 'studio', label: 'Studio', icon: 'square' },
    { id: 'bedsitter', label: 'Bedsitter', icon: 'grid' },
    { id: 'commercial', label: 'Commercial', icon: 'briefcase' },
    { id: 'land', label: 'Land', icon: 'map' },
];

// Listing type options
export const LISTING_TYPES = [
    { id: 'rent', label: 'For Rent' },
    { id: 'sale', label: 'For Sale' },
];

// Common amenities
export const AMENITIES = [
    'WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Security',
    'CCTV', 'Generator', 'Water Tank', 'Garden', 'Balcony',
    'Elevator', 'Rooftop', 'Pet Friendly', 'Furnished',
];
