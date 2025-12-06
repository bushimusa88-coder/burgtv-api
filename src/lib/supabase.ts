import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Public client for general operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for service-level operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database Tables
export const TABLES = {
  DEVICES: 'devices',
  DEVICE_LOGS: 'device_logs',
  API_KEYS: 'api_keys'
} as const;

// Database Schema Types
export interface DatabaseDevice {
  id: string;
  mac_address: string;
  device_type: string;
  device_name: string | null;
  m3u_url: string;
  epg_url: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  last_active: string | null;
  captcha_verified: boolean;
}

export interface DatabaseDeviceLog {
  id: string;
  device_id: string;
  action: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}