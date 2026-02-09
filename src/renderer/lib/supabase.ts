import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hubpmhyiuzyllkgjzjoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1YnBtaHlpdXp5bGxrZ2p6am9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTYyMTEsImV4cCI6MjA4NjA3MjIxMX0.sunGcTj1_wM8Ad3ISnUdU4wk4nUpRnM3CKu4aJp4IYs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'nexus-supabase-auth',
  },
});

export { SUPABASE_URL, SUPABASE_ANON_KEY };
