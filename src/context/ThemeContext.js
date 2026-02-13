import React, { createContext, useContext } from 'react';

// Light theme colors only - no dark mode
const lightColors = {
    primary: '#FE9200',
    primaryLight: '#FFF5E6',
    background: '#F8F9FB',
    card: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    blue: '#3B82F6',
    blueLight: '#DBEAFE',
    purple: '#8B5CF6',
    purpleLight: '#EDE9FE',
    dark: '#1E293B',
    darkHeader: '#0F172A',
    inputBg: '#FFFFFF',
    modalBg: '#FFFFFF',
    tabBar: '#FFFFFF',
    statusBar: 'dark-content',
};

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    // Always use light mode - no theme switching
    const value = {
        isDark: false,
        colors: lightColors,
        isLoaded: true,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export { lightColors };
export default ThemeContext;
