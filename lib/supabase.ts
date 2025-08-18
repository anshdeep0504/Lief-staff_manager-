import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug logging to help troubleshoot
console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'Missing');
console.log('Supabase Key:', supabaseKey ? 'Configured' : 'Missing');

// Create a mock client for fallback
const createMockClient = () => ({
  auth: {
    getUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: new Error('Supabase not configured') }),
    signUp: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    signInWithOtp: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    resetPasswordForEmail: async () => ({ data: {}, error: new Error('Supabase not configured') }),
    updateUser: async () => ({ data: { user: null }, error: new Error('Supabase not configured') }),
    setSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
    getSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') }),
    refreshSession: async () => ({ data: { session: null }, error: new Error('Supabase not configured') })
  },
      from: () => ({
      select: () => ({
        order: () => ({
          eq: () => ({
            is: () => ({
              single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
            })
          }),
          eq: () => ({
            is: () => ({
              single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
            })
          }),
          is: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          }),
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        }),
        eq: () => ({
          is: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
          }),
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        }),
        is: () => ({
          single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
        }),
        insert: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
        update: () => ({
          eq: () => ({
            is: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') })
          })
        }),
        delete: () => Promise.resolve({ data: [], error: new Error('Supabase not configured') }),
        single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      })
    })
});

// Initialize Supabase client
let supabaseClient: ReturnType<typeof createClient> | ReturnType<typeof createMockClient>;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please create a .env.local file with:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  
  // Use mock client
  supabaseClient = createMockClient();
} else {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    // Fallback to mock client
    supabaseClient = createMockClient();
  }
}

export const supabase = supabaseClient;
