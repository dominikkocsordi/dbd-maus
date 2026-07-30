// Passkeys brauchen supabase-js >= 2.105.0 und das experimentelle Opt-in.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.105.0';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js?v=21';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: { passkey: true },
  },
});
