import { createClient } from '@supabase/supabase-js';

/**
 * Dashboard (external) Supabase project client.
 * Used to push activity feed, bug logs, funnel metrics, security sessions
 * and read country/climate data from the Imvelo admin dashboard backend.
 *
 * This is intentionally separate from the main app's Supabase client so it
 * does not interfere with auth, RLS or types of the primary project.
 */

const DASHBOARD_URL = 'https://fqvbyqmhlknshqfpdlgn.supabase.co';
const DASHBOARD_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxdmJ5cW1obGtuc2hxZnBkbGduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTIxNTcsImV4cCI6MjA5MzQ4ODE1N30.h3mO_yeSSunSByWQIpoGoHOhbh7Z9O70Jk8hcaFj4IA';

export const dashboardSupabase = createClient(DASHBOARD_URL, DASHBOARD_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const REST_BASE = `${DASHBOARD_URL}/rest/v1`;

function headers(userToken?: string) {
  return {
    apikey: DASHBOARD_ANON_KEY,
    Authorization: `Bearer ${userToken || DASHBOARD_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

export async function dashboardFetch<T = any>(
  path: string,
  opts: { method?: string; body?: any; userToken?: string } = {}
): Promise<T | null> {
  try {
    const res = await fetch(`${REST_BASE}/${path.replace(/^\//, '')}`, {
      method: opts.method || 'GET',
      headers: headers(opts.userToken),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      console.warn('[dashboard] request failed', res.status, await res.text());
      return null;
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch (err) {
    console.warn('[dashboard] request error', err);
    return null;
  }
}

// Convenience helpers
export const dashboard = {
  logActivity: (event: Record<string, any>, userToken?: string) =>
    dashboardFetch('activity_events', { method: 'POST', body: event, userToken }),
  logBug: (bug: Record<string, any>, userToken?: string) =>
    dashboardFetch('bug_logs', { method: 'POST', body: bug, userToken }),
  logSecuritySession: (session: Record<string, any>, userToken?: string) =>
    dashboardFetch('security_sessions', { method: 'POST', body: session, userToken }),
  getCountries: (userToken?: string) =>
    dashboardFetch('countries?select=*', { userToken }),
  getFunnelMetrics: (userToken?: string) =>
    dashboardFetch('funnel_metrics?select=*&order=position', { userToken }),
};
