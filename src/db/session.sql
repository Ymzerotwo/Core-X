-- ==============================================================================
-- Table: public.sessions
-- Purpose: A public mirror of Supabase's private 'auth.sessions' table.
-- Allows users to view their active devices and revoke access.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY,
    -- Name: Session ID | Usage: Matches auth.sessions.id | When to use: Revocation commands
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    -- Name: User ID | Usage: Session owner | When to use: Filtering my sessions
    ip_address INET,
    -- Name: IP Address | Usage: Security auditing | When to use: "Was this you?" alerts
    user_agent TEXT,
    -- Name: User Agent | Usage: Device fingerprinting | When to use: Displaying "Chrome across Windows"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Name: Created At | Usage: Login time | When to use: Sorting sessions
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Name: Updated At | Usage: Last refresh | When to use: Timeout logic
    expires_at TIMESTAMP WITH TIME ZONE -- Name: Expires At | Usage: JWT Expiry | When to use: Identifying dead sessions
);
-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_created_at ON public.sessions(created_at);
-- Enable Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON public.sessions FOR
SELECT USING (auth.uid() = user_id);
-- Policy: Users can delete their own sessions (Revoke from UI)
-- Note: This only deletes from the public view. Actual revocation requires calling the revoke function.
CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);
-- ==============================================================================
-- Function: handle_auth_session_change
-- Importance: Critical synchronization trigger. It watches Supabase's hidden
-- 'auth.sessions' table and copies every change to 'public.sessions'.
-- It also fetches IP and UserAgent from Audit Logs to enrich the data.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_auth_session_change() RETURNS TRIGGER AS $$
DECLARE v_ip inet;
v_ua text;
BEGIN IF (TG_OP = 'INSERT') THEN -- Attempt to find IP and UA from audit logs (best effort)
-- Note: This relies on Supabase logging the login event to auth.audit_log_entries
BEGIN
SELECT ip_address::inet,
    user_agent INTO v_ip,
    v_ua
FROM auth.audit_log_entries
WHERE actor_id = NEW.user_id
ORDER BY created_at DESC
LIMIT 1;
EXCEPTION
WHEN OTHERS THEN v_ip := NULL;
v_ua := NULL;
END;
INSERT INTO public.sessions (
        id,
        user_id,
        ip_address,
        user_agent,
        created_at,
        updated_at,
        expires_at
    )
VALUES (
        NEW.id,
        NEW.user_id,
        v_ip,
        v_ua,
        NEW.created_at,
        NEW.updated_at,
        NEW.not_after
    ) ON CONFLICT (id) DO
UPDATE
SET updated_at = EXCLUDED.updated_at,
    expires_at = EXCLUDED.expires_at;
RETURN NEW;
ELSIF (TG_OP = 'UPDATE') THEN
UPDATE public.sessions
SET updated_at = NEW.updated_at,
    expires_at = NEW.not_after
WHERE id = NEW.id;
RETURN NEW;
ELSIF (TG_OP = 'DELETE') THEN
DELETE FROM public.sessions
WHERE id = OLD.id;
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to sync creation/updates/deletion from auth.sessions
-- Note: This requires the code to be run by a superuser/admin as it attaches to auth schema
CREATE OR REPLACE TRIGGER on_auth_session_change
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON auth.sessions FOR EACH ROW EXECUTE FUNCTION public.handle_auth_session_change();
-- ==============================================================================
-- Function: revoke_session
-- Importance: Allows a user to securely revoke a specific session (JWT) by ID.
-- It deletes the session from 'auth.sessions', forcing the user to log out.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.revoke_session(session_uuid UUID) RETURNS VOID AS $$ BEGIN -- Verify the session belongs to the requesting user
    IF EXISTS (
        SELECT 1
        FROM auth.sessions
        WHERE id = session_uuid
            AND user_id = auth.uid()
    ) THEN
DELETE FROM auth.sessions
WHERE id = session_uuid;
ELSE RAISE EXCEPTION 'Session not found or permission denied';
END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
/*
 ==============================================================================
 USAGE GUIDE & DOCUMENTATION
 ==============================================================================
 
 ### 1. Overview
 This file bridges the gap between Supabase's secure/hidden Auth system and your
 Application's UI. It allows you to build a "Device Management" page.
 
 ### 2. Key Features
 - **Auto-Sync**: Triggers automatically keep `public.sessions` in sync with `auth.sessions`.
 - **Enrichment**: Tries to find the IP and User Agent associated with the session login.
 - **Security**: Detailed RLS ensures users can only see their own sessions.
 
 ### 3. Usage Instructions
 - **List Sessions**: `SELECT * FROM public.sessions WHERE user_id = auth.uid()`
 - **Show "Current Device"**: In your UI, match the current Session ID (from JWT) with `id` in this table.
 - **Revoke Session**: Call the RPC function: `rpc('revoke_session', { session_uuid: '...' })`
 
 ### 4. Important Notes
 - The Trigger `on_auth_session_change` must be deployed by a Database Superuser (postgres role)
 because it attaches to the system schema `auth`.
 */