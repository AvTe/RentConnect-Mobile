// API Configuration
const API_BASE_URL = 'https://yoombaa.com'; // Production URL

// Location Search API
export const searchLocations = async (query, country = 'ke,in') => {
    try {
        if (query.length < 2) return [];
        const response = await fetch(
            `${API_BASE_URL}/api/location-search?q=${encodeURIComponent(query)}&country=${country}`
        );
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Location search error:', error);
        return [];
    }
};

// Reverse Geocode (GPS to Address)
export const reverseGeocode = async (lat, lon) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/geocode?lat=${lat}&lon=${lon}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Reverse geocode error:', error);
        return null;
    }
};

// AI Parse Requirements
export const parseRequirementsWithAI = async (text) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/parse-requirements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('AI parse error:', error);
        return { success: false, error: 'Failed to process' };
    }
};

// Send OTP
export const sendOTP = async (phoneNumber) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Send OTP error:', error);
        return { success: false, error: 'Failed to send OTP' };
    }
};

// Verify OTP
export const verifyOTP = async (phoneNumber, otp) => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, otp }),
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Verify OTP error:', error);
        return { success: false, error: 'Failed to verify OTP' };
    }
};

// Currency Configuration
export const CURRENCY_CONFIG = {
    KE: { symbol: 'KSh', code: 'KES', locale: 'en-KE' },
    IN: { symbol: '₹', code: 'INR', locale: 'en-IN' },
    US: { symbol: '$', code: 'USD', locale: 'en-US' },
    NG: { symbol: '₦', code: 'NGN', locale: 'en-NG' },
};

// Budget Presets by Country
export const BUDGET_PRESETS = {
    KE: [
        { id: 'under20k', label: 'Under 20K', min: 0, max: 20000 },
        { id: '20k-40k', label: '20K - 40K', min: 20000, max: 40000 },
        { id: '40k-70k', label: '40K - 70K', min: 40000, max: 70000 },
        { id: '70k-100k', label: '70K - 100K', min: 70000, max: 100000 },
        { id: '100k+', label: '100K+', min: 100000, max: 500000 },
    ],
    IN: [
        { id: 'under15k', label: 'Under 15K', min: 0, max: 15000 },
        { id: '15k-30k', label: '15K - 30K', min: 15000, max: 30000 },
        { id: '30k-50k', label: '30K - 50K', min: 30000, max: 50000 },
        { id: '50k-80k', label: '50K - 80K', min: 50000, max: 80000 },
        { id: '80k+', label: '80K+', min: 80000, max: 500000 },
    ],
};

// Property Types
export const PROPERTY_TYPES = [
    { id: '1 Bedroom', label: '1 Bedroom', icon: 'home', description: 'Perfect for singles or couples' },
    { id: '2 Bedroom', label: '2 Bedroom', icon: 'grid', description: 'Ideal for small families' },
    { id: '3 Bedroom', label: '3+ Bedroom', icon: 'layout', description: 'Spacious family living' },
    { id: 'Studio', label: 'Studio', icon: 'square', description: 'Compact & efficient' },
    { id: 'Self Contain', label: 'Self Contain', icon: 'box', description: 'All-in-one living space' },
    { id: 'Duplex', label: 'Duplex', icon: 'layers', description: 'Two-story living' },
];

// Format currency
export const formatCurrency = (amount, countryCode = 'KE') => {
    const config = CURRENCY_CONFIG[countryCode] || CURRENCY_CONFIG.KE;
    const num = parseInt(amount) || 0;
    return `${config.symbol} ${num.toLocaleString(config.locale)}`;
};
