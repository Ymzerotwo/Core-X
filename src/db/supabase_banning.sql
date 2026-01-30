-- ==============================================================================
-- Table: blacklisted_ips
-- Purpose: The first line of defense. Blocks malicious IP addresses at the database level.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS blacklisted_ips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Name: ID | Usage: Unique identifier | When to use: Deleting a block
    ip_address TEXT NOT NULL UNIQUE,
    -- Name: IP Address | Usage: The blocked IP | When to use: Middleware check
    reason TEXT,
    -- Name: Reason | Usage: Why it was blocked? | When to use: "DDoS Attempt", "SQLi"
    created_at TIMESTAMPTZ DEFAULT NOW() -- Name: Date | Usage: Block time | When to use: Expiration logic
);
-- ==============================================================================
-- Table: banned_users
-- Purpose: Prevents specific user accounts from accessing the API, regardless of IP.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Name: ID | Usage: Unique identifier | When to use: Reference
    user_id UUID NOT NULL UNIQUE,
    -- Name: User ID | Usage: Blocked User | When to use: Login Middleware
    reason TEXT,
    -- Name: Reason | Usage: Ban justification | When to use: "Violation of Terms"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Name: Date | Usage: Ban start | When to use: History
    expires_at TIMESTAMPTZ -- Name: Expires At | Usage: Temporary ban end | When to use: "Lift ban after 7 days"
);
-- ==============================================================================
-- Table: revoked_tokens
-- Purpose: Emergency kill-switch for compromised JWT tokens before they expire.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS revoked_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- Name: ID | Usage: Unique reference | When to use: Logging
    token_signature TEXT NOT NULL UNIQUE,
    -- Name: Signature | Usage: JWT Signature part | When to use: Auth Middleware check
    reason TEXT,
    -- Name: Reason | Usage: Reason for revocation | When to use: "Compromised device"
    revoked_at TIMESTAMPTZ DEFAULT NOW() -- Name: Date | Usage: Revocation time | When to use: Cleanup jobs
);
-- Indexes for performance (Crucial for middleware speed)
CREATE INDEX IF NOT EXISTS idx_blacklisted_ips_ip ON blacklisted_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_banned_users_user ON banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token_signature);
-- Row Level Security (RLS)
ALTER TABLE blacklisted_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;
-- Note: These tables are effectively "System Tables".
-- Public access is completely DENIED.
-- Only the Backend (Service Role) can Read/Write these tables to enforce bans.
/*
 ==============================================================================
 USAGE GUIDE & DOCUMENTATION
 ==============================================================================
 
 ### 1. Overview
 This file establishes the "Penalty Box" of the system. It is used by the
 `ban.middleware` and `auth.middleware` to reject requests instantly.
 
 ### 2. Components
 - **Blacklisted IPs**: Blocks the connection before it even reaches the logic. High performance.
 - **Banned Users**: Blocks the user even if they switch IPs.
 - **Revoked Tokens**: Invalidates a specific session immediately (e.g. on "Logout from all devices").
 
 ### 3. Usage Instructions
 - **To Ban an IP**: `INSERT INTO blacklisted_ips (ip_address, reason) VALUES ('1.2.3.4', 'Spam')`
 - **To Ban a User**: `INSERT INTO banned_users (user_id, reason) VALUES ('...', 'ToS Violation')`
 - **To Check**: The backend Middleware automatically queries these tables on every request.
 */