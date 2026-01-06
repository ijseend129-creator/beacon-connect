-- Fix RLS policies for conversation_invites to be PERMISSIVE instead of RESTRICTIVE
DROP POLICY IF EXISTS "Users can create invites" ON public.conversation_invites;
DROP POLICY IF EXISTS "Users can view their invites" ON public.conversation_invites;
DROP POLICY IF EXISTS "Users can respond to their invites" ON public.conversation_invites;

-- Create PERMISSIVE policies (default behavior)
CREATE POLICY "Users can create invites"
ON public.conversation_invites
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can view their invites"
ON public.conversation_invites
FOR SELECT
TO authenticated
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can respond to their invites"
ON public.conversation_invites
FOR UPDATE
TO authenticated
USING (auth.uid() = invitee_id);