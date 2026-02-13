// Theme constants for the entire app
// Import FONTS from isolated file to prevent circular dependencies
import FONTS from './fonts';

// Re-export FONTS for backward compatibility
export { FONTS };

export const COLORS = {
    primary: '#FE9200',
    primaryDark: '#E58300',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textLight: '#9CA3AF',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    purple: '#8B5CF6',
    amber: '#D97706',
};

export const FONT_SIZES = {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
};
