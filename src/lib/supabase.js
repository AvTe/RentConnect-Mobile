import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// These are the same credentials as the web app - connects to the SAME backend
const SUPABASE_URL = 'https://yydwhwkvrvgkqnmirbrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZHdod2t2cnZna3FubWlyYnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzMwNjEsImV4cCI6MjA1MjQ0OTA2MX0.VMe1vDmjV4rWMh3Hrob7cILgAiEQeNB9O84wPjOVi1w';

// Create Supabase client with React Native specific configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { SUPABASE_URL };
