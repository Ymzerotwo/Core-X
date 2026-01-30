-- ==============================================================================
-- Table: public.notifications
-- Purpose: Delivers in-app alerts and notifications to users.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: ID | Usage: Unique identifier | When to use: Deleting single notification
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    -- Name: User ID | Usage: Recipient | When to use: Filtering my notifications
    type TEXT NOT NULL CHECK (
        type IN (
            'info',
            'success',
            'warning',
            'error',
            'security',
            'billing'
        )
    ),
    -- Name: Type | Usage: Styling variant | When to use: CSS Class (e.g. bg-red-500)
    title TEXT NOT NULL,
    -- Name: Title | Usage: Short header | When to use: Notification tray
    message TEXT NOT NULL,
    -- Name: Message | Usage: Body text | When to use: Details
    link TEXT,
    -- Name: Link | Usage: Action URL | When to use: "Click here to fix"
    is_read BOOLEAN DEFAULT FALSE,
    -- Name: Read Status | Usage: Unread badge | When to use: "Mark all as read"
    metadata JSONB DEFAULT '{}'::JSONB,
    -- Name: Metadata | Usage: Deep links/IDs | When to use: Frontend routing logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Name: Date | Usage: Timestamp | When to use: Sorting/Grouping
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
-- RLS: Users can view and update (mark as read) their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR
UPDATE USING (auth.uid() = user_id);
-- ==============================================================================
-- Table: public.admin_audit_logs
-- Purpose: Security-Critical immutable log of all administrative actions.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: ID | Usage: Log ID | When to use: Reference
    admin_id UUID REFERENCES public.users(id) ON DELETE
    SET NULL,
        -- Name: Admin ID | Usage: Actor | When to use: "Who did this?"
        action TEXT NOT NULL,
        -- Name: Action | Usage: Event Type | When to use: Filtering (e.g. "user.banned")
        entity_type TEXT NOT NULL,
        -- Name: Entity Type | Usage: Target Table | When to use: Grouping by User/System
        entity_id UUID,
        -- Name: Entity ID | Usage: Target ID | When to use: Finding history of specific user
        details JSONB DEFAULT '{}'::JSONB,
        -- Name: Details | Usage: Diff (Old vs New) | When to use: Undo/Revert analysis
        ip_address INET,
        -- Name: IP | Usage: Actor IP | When to use: Security Forensics
        user_agent TEXT,
        -- Name: User Agent | Usage: Actor Device | When to use: Security Forensics
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Name: Date | Usage: Timestamp | When to use: Timeline view
);
CREATE INDEX idx_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX idx_audit_logs_entity_id ON public.admin_audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.admin_audit_logs(created_at);
-- ==============================================================================
-- Function: prevent_audit_log_modification
-- Importance: Enforces Immutable Logs Security Pattern.
-- Absolutely prevents ANY modification or deletion of audit logs, protecting evidence.
-- ==============================================================================
CREATE OR REPLACE FUNCTION prevent_audit_log_modification() RETURNS TRIGGER AS $$ BEGIN RAISE EXCEPTION 'Audit logs are immutable cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER protect_audit_logs BEFORE
UPDATE
    OR DELETE ON public.admin_audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
-- RLS: Only Admins can view (RESTRICTED)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- Note: Public access is DENIED BY DEFAULT (No policies = No access).
-- Access is reserved for Backend via Service Role.
-- ==============================================================================
-- Table: public.support_tickets
-- Purpose: A full-featured ticketing system for user support.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: Ticket ID | Usage: Unique reference | When to use: Ticket #1234
    user_id UUID REFERENCES public.users(id) ON DELETE
    SET NULL,
        -- Name: User ID | Usage: Creator | When to use: My Tickets
        email TEXT NOT NULL,
        -- Name: Email | Usage: Guest/User Email | When to use: Notifications
        subject TEXT NOT NULL,
        -- Name: Subject | Usage: Summary | When to use: List View
        message TEXT NOT NULL,
        -- Name: Description | Usage: Initial problem | When to use: Initial context
        status TEXT DEFAULT 'open' CHECK (
            status IN ('open', 'in_progress', 'resolved', 'closed')
        ),
        -- Name: Status | Usage: Workflow state | When to use: Filtering active tickets
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        -- Name: Priority | Usage: Urgency | When to use: SLA/Triage
        category TEXT DEFAULT 'general' CHECK (
            category IN (
                'general',
                'billing',
                'technical',
                'feature_request'
            )
        ),
        -- Name: Category | Usage: Topic | When to use: Routing to correct dept
        admin_notes TEXT,
        -- Name: Admin Notes | Usage: PRIVATE scratchpad | When to use: Internal staff coordination
        assigned_to UUID REFERENCES public.users(id) ON DELETE
    SET NULL,
        -- Name: Assignee | Usage: Staff handling it | When to use: Workload distribution
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        -- Name: Created | Usage: Open date | When to use: SLA tracking
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Name: Updated | Usage: Last activity | When to use: Sorting by recent
);
-- ==============================================================================
-- Table: public.ticket_messages
-- Purpose: Threaded conversation for tickets, supporting internal & external msgs.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name: Msg ID | Usage: Unique ID | When to use: Edit/Delete specific msg
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    -- Name: Ticket ID | Usage: Parent conversation | When to use: Grouping messages
    sender_id UUID REFERENCES public.users(id) ON DELETE
    SET NULL,
        -- Name: Sender | Usage: Author | When to use: Avatar display
        sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'support', 'system')),
        -- Name: Type | Usage: Role distinction | When to use: Styling (Left/Right align)
        message TEXT NOT NULL,
        -- Name: Content | Usage: The text | When to use: Displaying body
        attachments JSONB DEFAULT '[]'::JSONB,
        -- Name: Attachments | Usage: File URLs | When to use: Screenshots/Logs
        is_internal BOOLEAN DEFAULT FALSE,
        -- Name: Internal | Usage: Private Flag | When to use: Staff-only notes (Hidden from user)
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Name: Date | Usage: Timestamp | When to use: Sorting
);
CREATE INDEX idx_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
-- Updated_at Trigger for Tickets
CREATE TRIGGER update_tickets_updated_at BEFORE
UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
-- 1. View own tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR
SELECT USING (auth.uid() = user_id);
-- 2. Create tickets
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- 3. Update own tickets (e.g. close them)
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR
UPDATE USING (auth.uid() = user_id);
-- 4. View messages (excluding internal)
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.support_tickets
            WHERE id = ticket_messages.ticket_id
                AND user_id = auth.uid()
        )
        AND is_internal = FALSE
    );
-- 5. Reply to tickets
CREATE POLICY "Users can insert ticket messages" ON public.ticket_messages FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.support_tickets
            WHERE id = ticket_messages.ticket_id
                AND user_id = auth.uid()
        )
        AND is_internal = FALSE
        AND sender_id = auth.uid()
    );
/*
 ==============================================================================
 USAGE GUIDE & DOCUMENTATION
 ==============================================================================
 
 ### 1. Notifications
 - **How to use**: Insert into `notifications` via Backend functions.
 - **Frontend**: Check `is_read = false` to show a red badge.
 
 ### 2. Admin Audit Logs
 - **Security**: These logs are READ-ONLY via DB triggers. Even admins cannot delete them.
 - **Access**: Only accessible via Service Role (Backend) to prevent tampering.
 
 ### 3. Support Tickets
 - **Flow**: User creates Ticket -> Admin sees it in Dashboard -> Admin Assigns to self -> Reply.
 - **Threaded**: Messages are stored separately in `ticket_messages`.
 - **Internal Notes**: Support staff can set `is_internal = true` to chat privately within a ticket context.
 */