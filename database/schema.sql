-- BurgTV Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('firetv', 'samsung', 'lg', 'appletv', 'android', 'ios')),
    device_name VARCHAR(100),
    m3u_url TEXT NOT NULL,
    epg_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    captcha_verified BOOLEAN DEFAULT false,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Device logs table for audit trail
CREATE TABLE IF NOT EXISTS device_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API keys table (for future use)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_mac_address ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_device_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON devices(created_at);
CREATE INDEX IF NOT EXISTS idx_device_logs_device_id ON device_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_action ON device_logs(action);
CREATE INDEX IF NOT EXISTS idx_device_logs_created_at ON device_logs(created_at);

-- RLS (Row Level Security) policies
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy for devices: Allow service role full access
CREATE POLICY "Service role can access devices" ON devices
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for device_logs: Allow service role full access  
CREATE POLICY "Service role can access device_logs" ON device_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Policy for api_keys: Allow service role full access
CREATE POLICY "Service role can access api_keys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to validate MAC address format
CREATE OR REPLACE FUNCTION validate_mac_address(mac_addr TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN mac_addr ~ '^([0-9A-Fa-f]{2}[:]){5}([0-9A-Fa-f]{2})$';
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate MAC address format
ALTER TABLE devices ADD CONSTRAINT devices_mac_address_format_check 
    CHECK (validate_mac_address(mac_address));

-- Function to get device statistics
CREATE OR REPLACE FUNCTION get_device_stats()
RETURNS TABLE (
    total_devices BIGINT,
    active_devices BIGINT,
    device_types JSONB,
    registrations_today BIGINT,
    registrations_this_week BIGINT,
    registrations_this_month BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_devices,
        COUNT(*) FILTER (WHERE status = 'active') as active_devices,
        jsonb_object_agg(device_type, type_count) as device_types,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as registrations_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as registrations_this_week,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as registrations_this_month
    FROM (
        SELECT 
            device_type,
            status,
            created_at,
            COUNT(*) as type_count
        FROM devices 
        GROUP BY device_type, status, created_at
    ) as device_data;
END;
$$ LANGUAGE plpgsql;

-- Sample data (optional - remove in production)
-- INSERT INTO devices (mac_address, device_type, device_name, m3u_url, status) VALUES
-- ('AA:BB:CC:DD:EE:FF', 'firetv', 'Living Room Fire TV', 'https://example.com/playlist.m3u', 'active'),
-- ('11:22:33:44:55:66', 'samsung', 'Bedroom Samsung TV', 'https://example.com/playlist2.m3u', 'active')
-- ON CONFLICT (mac_address) DO NOTHING;