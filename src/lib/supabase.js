import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yydwhwkvrvgkqnmirbrr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZHdod2t2cnZna3FubWlyYnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjY4OTcsImV4cCI6MjA4MDE0Mjg5N30.l5TXQLRz1JI9GXoY6jbhe6bdVpekJDRBlETrHWW-0Y4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export { SUPABASE_URL };