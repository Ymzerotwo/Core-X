-- ==============================================================================
-- Table: public.subscription_plans
-- Purpose: Defines the available subscription tiers (Free, Pro, Enterprise).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: Plan ID | Usage: Unique identifier | When to use: Foreign key in subscriptions
    name TEXT NOT NULL,
    -- Name: Plan Name | Usage: Display name (e.g. "Pro Plan") | When to use: Pricing page UI
    code TEXT UNIQUE NOT NULL,
    -- Name: Code | Usage: System identifier | When to use: Hardcoded logic (if plan.code == 'pro')
    description TEXT,
    -- Name: Description | Usage: Plan details | When to use: Pricing page features list
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    -- Name: Price | Usage: Monthly/Yearly cost | When to use: Billing calculations
    currency TEXT DEFAULT 'USD',
    -- Name: Currency | Usage: ISO Currency code | When to use: Formatting prices
    billing_interval TEXT CHECK (
        billing_interval IN ('month', 'year', 'one_time', 'lifetime')
    ),
    -- Name: Interval | Usage: Recurring frequency | When to use: Subscription logic
    features JSONB DEFAULT '[]'::JSONB,
    -- Name: Features | Usage: Feature flags/limits | When to use: Feature gating logic
    is_active BOOLEAN DEFAULT TRUE,
    -- Name: Active | Usage: Availability flag | When to use: Hiding grandfathered plans
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Name: Created At | Usage: Creation date | When to use: Auditing
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Name: Updated At | Usage: Last modification | When to use: Cache invalidation
);
-- ==============================================================================
-- Table: public.subscriptions
-- Purpose: Tracks which user is subscribed to which plan and their status.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: Sub ID | Usage: Unique identifier | When to use: Link payments to value
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    -- Name: User ID | Usage: Owner of sub | When to use: Identify subscriber
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    -- Name: Plan ID | Usage: What they bought | When to use: Determine features
    status TEXT NOT NULL DEFAULT 'incomplete' CHECK (
        status IN (
            'active',
            'canceled',
            'incomplete',
            'incomplete_expired',
            'past_due',
            'trialing',
            'unpaid'
        )
    ),
    -- Name: Status | Usage: Stripe/Payment status | When to use: Granting/Revoking access
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Name: Start Date | Usage: Billing cycle start | When to use: Invoices
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    -- Name: End Date | Usage: Expiry date | When to use: Expiration check
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    -- Name: Cancel at End | Usage: Cancellation intent | When to use: UI 'Resubscribe' button
    canceled_at TIMESTAMP WITH TIME ZONE,
    -- Name: Canceled At | Usage: Cancellation timestamp | When to use: Churn analytics
    trial_start TIMESTAMP WITH TIME ZONE,
    -- Name: Trial Start | Usage: Trial info | When to use: Trial banners
    trial_end TIMESTAMP WITH TIME ZONE,
    -- Name: Trial End | Usage: Trial info | When to use: Trial expiration
    metadata JSONB DEFAULT '{}'::JSONB,
    -- Name: Metadata | Usage: Extra provider info | When to use: Stripe Sub ID storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Name: Created At | Usage: Signup date | When to use: Cohort analysis
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Name: Updated At | Usage: Last synced | When to use: Sync logic
);
-- ==============================================================================
-- Table: public.payments
-- Purpose: An immutable ledger of all financial transactions (Invoices/Receipts).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: Payment ID | Usage: Unique identifier | When to use: Receipt generation
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    -- Name: User ID | Usage: Structure owner | When to use: User history
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE
    SET NULL,
        -- Name: Sub ID | Usage: Related subscription | When to use: Linking payment to renewal
        amount DECIMAL(10, 2) NOT NULL,
        -- Name: Amount | Usage: Charged value | When to use: Revenue stats
        currency TEXT DEFAULT 'USD',
        -- Name: Currency | Usage: Payment currency | When to use: Display currency
        status TEXT NOT NULL CHECK (
            status IN ('succeeded', 'pending', 'failed', 'refunded')
        ),
        -- Name: Status | Usage: Transaction state | When to use: Confirmation UI
        provider TEXT NOT NULL,
        -- Name: Provider | Usage: Gateway name | When to use: Stripe/PayPal distinction
        provider_payment_id TEXT UNIQUE,
        -- Name: Provider ID | Usage: Idempotency Key | When to use: Deduplication & lookups
        receipt_url TEXT,
        -- Name: Receipt URL | Usage: Link to invoice | When to use: "Download Invoice" button
        payment_method_details JSONB DEFAULT '{}'::JSONB,
        -- Name: Payment Method | Usage: Card info (Last4) | When to use: "Paid with Visa 4242"
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Name: Date | Usage: Transaction time | When to use: Sorting history
);
-- Indexes for performance
CREATE INDEX idx_plans_code ON public.subscription_plans(code);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
-- ==============================================================================
-- Function: update_updated_at_column
-- Importance: Standardizes timestamp updates across all payment tables.
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_plans_updated_at BEFORE
UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE
UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- RLS Policies
-- 1. Plans: Visible to everyone
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans FOR
SELECT USING (is_active = true);
-- 2. Subscriptions: Users view their own
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR
SELECT USING (auth.uid() = user_id);
-- 3. Payments: Users view their own history
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own payments" ON public.payments FOR
SELECT USING (auth.uid() = user_id);
/*
 ==============================================================================
 USAGE GUIDE & DOCUMENTATION
 ==============================================================================
 
 ### 1. Overview
 This file manages the monetization layer. It separates "Plans" (Products) from
 "Subscriptions" (User relationships) and "Payments" (Transaction history).
 
 ### 2. Key Features
 - **Idempotency**: `provider_payment_id` is UNIQUE to prevent double-charging bugs.
 - **Data Safety**: `ON DELETE RESTRICT` protects financial records from accidental user deletion.
 - **Flexible Plans**: Supports one-time, monthly, yearly, and lifetime billing.
 
 ### 3. Usage Instructions
 - **Creating a Plan**: Insert into `subscription_plans`. Usually done by Admin.
 - **Subscribing a User**: 
 1. Create a `subscription` record with status 'incomplete'.
 2. Process payment via Stripe.
 3. Update `subscription` status to 'active' via Webhook.
 - **Recording Payment**: Always insert into `payments` on successful Webhook event.
 
 ### 4. Integration Notes
 - **Webhooks**: This system is designed to be driven by Webhooks (Stripe/PayPal).
 - **Backend Only**: Users cannot INSERT/UPDATE these tables directly (RLS blocks writes).
 All changes must come from your secure Backend server (Service Role).
 */