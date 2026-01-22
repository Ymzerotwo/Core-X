-- 1. Blacklisted IPs Table
CREATE TABLE IF NOT EXISTS blacklisted_ips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Banned Users Table
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ -- Optional: for temporary bans
);
-- 3. Revoked Tokens Table
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_signature TEXT NOT NULL UNIQUE,
    -- Store the signature or hash, not the full token if possible, but full token is okay for simplicity
    reason TEXT,
    revoked_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance (though we cache in RAM, indexes help the fetch)
CREATE INDEX IF NOT EXISTS idx_blacklisted_ips_ip ON blacklisted_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_users_user ON banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token_signature);
-- Row Level Security (RLS)
-- Enable RLS
ALTER TABLE blacklisted_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;
-- Policies: Only service_role can write, public can read (or restrict to service_role if only backend uses it)
-- Assuming backend uses service_role key, we can restrict everything.
-- If you want to manage this from a dashboard, you'll need policies for admins.