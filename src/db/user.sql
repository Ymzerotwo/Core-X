CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ==============================================================================
-- Table: public.users
-- Purpose: Central repository for user profiles and account settings.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: ID | Usage: Unique identifier | When to use: Foreign keys, API lookups
    username TEXT UNIQUE NOT NULL,
    -- Name: Username | Usage: Unique display handle | When to use: Public profile URL, mentions
    email TEXT UNIQUE NOT NULL,
    -- Name: Email | Usage: Login & Notifications | When to use: Auth, transactional emails
    phone_number TEXT UNIQUE,
    -- Name: Phone Number | Usage: SMS & 2FA | When to use: Verification, urgent alerts
    full_name TEXT,
    -- Name: Full Name | Usage: Display name | When to use: UI greeting, invoices
    bio TEXT,
    -- Name: Bio | Usage: Profile description | When to use: User profile page
    avatar_url TEXT,
    -- Name: Avatar URL | Usage: Profile picture link | When to use: UI avatars, comments
    banner_url TEXT,
    -- Name: Banner URL | Usage: Profile header image | When to use: Profile page header
    coins INTEGER DEFAULT 0,
    -- Name: Coins | Usage: Virtual currency balance | When to use: In-app purchases, rewards
    preferences JSONB DEFAULT '{}'::JSONB,
    -- Name: Preferences | Usage: User settings (theme, lang) | When to use: UI customization
    is_email_verified BOOLEAN DEFAULT FALSE,
    -- Name: Email Verified | Usage: Verification status | When to use: Access control, trust level
    is_phone_verified BOOLEAN DEFAULT FALSE,
    -- Name: Phone Verified | Usage: Verification status | When to use: Access control, trust level
    account_status TEXT DEFAULT 'active' CHECK (
        account_status IN ('active', 'banned', 'suspended', 'pending')
    ),
    -- Name: Status | Usage: Account state | When to use: Login checks, feature restrictions
    account_status_meta JSONB DEFAULT '{}'::JSONB,
    -- Name: Status Meta | Usage: Ban reason/time | When to use: Admin dashboard, user appeals
    account_type TEXT DEFAULT 'user' CHECK (
        account_type IN ('user', 'admin', 'moderator', 'developer')
    ),
    -- Name: Type | Usage: Role-based access | When to use: Permission checks (RBAC)
    is_two_factor_enabled BOOLEAN DEFAULT FALSE,
    -- Name: 2FA Enabled | Usage: Security flag | When to use: Login flow
    two_factor_method TEXT DEFAULT 'none' CHECK (
        two_factor_method IN ('app', 'sms', 'email', 'none')
    ),
    -- Name: 2FA Method | Usage: 2FA type | When to use: Sending 2FA codes
    last_login_at TIMESTAMP WITH TIME ZONE,
    -- Name: Last Login | Usage: Activity tracking | When to use: Security audit, active user stats
    login_count INTEGER DEFAULT 0,
    -- Name: Login Count | Usage: Engagement metric | When to use: User loyalty analysis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Name: Created At | Usage: Registration date | When to use: Sort by newest, stats
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Name: Updated At | Usage: Last modification | When to use: Cache invalidation
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL -- Name: Deleted At | Usage: Soft delete flag | When to use: Account recovery, data retention
);
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone_number ON public.users(phone_number);
-- ==============================================================================
-- Function: update_updated_at_column
-- Importance: Automatically updates the 'updated_at' timestamp on every row modification.
-- Ensures data freshness tracking without manual intervention.
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_users_updated_at BEFORE
UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ==============================================================================
-- Function: handle_new_user
-- Importance: Automatically creates a public user profile whenever a new user
-- signs up via Supabase Auth. Syncs metadata like avatar and name.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE username_val TEXT;
BEGIN -- Try to get username from metadata, or fallback to email local part
username_val := COALESCE(
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'preferred_username',
    SPLIT_PART(NEW.email, '@', 1)
);
INSERT INTO public.users (
        id,
        username,
        email,
        full_name,
        avatar_url,
        is_email_verified,
        account_type
    )
VALUES (
        NEW.id,
        username_val,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        CASE
            WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE
            ELSE FALSE
        END,
        'user'
    ) ON CONFLICT (id) DO
UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    is_email_verified = EXCLUDED.is_email_verified;
RETURN NEW;
EXCEPTION
WHEN unique_violation THEN -- Handle username collision by appending a random suffix
INSERT INTO public.users (
        id,
        username,
        email,
        full_name,
        avatar_url,
        is_email_verified,
        account_type
    )
VALUES (
        NEW.id,
        username_val || '_' || SUBSTRING(uuid_generate_v4()::text, 1, 5),
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        CASE
            WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE
            ELSE FALSE
        END,
        'user'
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR
SELECT USING (auth.uid() = id);
-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users FOR
UPDATE USING (auth.uid() = id);
/*
 ==============================================================================
 USAGE GUIDE & DOCUMENTATION
 ==============================================================================
 
 ### 1. Overview
 This file sets up the foundation of the user system. It includes the `users` table
 which mirrors key data from Supabase's internal `auth.users` table but adds
 application-specific profile fields (bio, coins, etc.).
 
 ### 2. Key Features
 - **Auto-Profile Creation**: A trigger `on_auth_user_created` ensures that as soon
 as a user signs up (Google, Email, etc.), a profile is ready in `public.users`.
 - **Username Generation**: Automatically generates usernames from emails if not provided.
 - **Security**: RLS enabled. Users can ONLY see and edit their own data.
 
 ### 3. Usage Instructions
 - **Querying**: `SELECT * FROM public.users WHERE id = auth.uid()`
 - **Updating Profile**: `UPDATE public.users SET bio = 'Hello' WHERE id = auth.uid()`
 - **Avatar Update**: Update `avatar_url` pointing to Supabase Storage.
 
 ### 4. Integration Notes
 - This table is the "Source of Truth" for user profile data in your frontend.
 - Do NOT modify `auth.users` directly; use this table for app logic.
 */