import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create the Supabase client only when environment variables are present.
// If they are missing (for example on a misconfigured deployment), avoid
// calling createClient because it throws synchronously and results in a
// white screen. Instead export a harmless stub that surfaces clear
// warnings and fails gracefully at call sites.
let supabase: any;
if (supabaseUrl && supabaseAnonKey) {
	supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
	// Minimal stub implementing commonly used entry points to avoid runtime
	// crashes. Call sites will receive predictable failures they can handle.
	console.warn('Supabase not configured: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is missing.');
	const noop = async () => ({ data: null, error: new Error('Supabase not configured') });
	supabase = {
		auth: {
			signIn: noop,
			signOut: noop,
			user: null,
			// onAuthStateChange should return an object matching the real client
			// so code can unsubscribe without throwing.
			onAuthStateChange: (cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
			getSession: async () => ({ data: { session: null }, error: null }),
		},
		from: () => ({ select: noop, insert: noop, update: noop, delete: noop }),
		rpc: noop,
		storage: {
			from: () => ({ download: noop, upload: noop }),
		},
	} as any;
}

export { supabase };
