-- Create a security definer function to check if user is in a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = _conversation_id
      AND user_id = _user_id
  )
$$;

-- Create a security definer function to get user's conversation ids
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id
  FROM public.conversation_participants
  WHERE user_id = _user_id
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Conversation creator can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

-- Recreate conversation_participants policies using security definer functions
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Conversation creator can add participants"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  ) OR user_id = auth.uid()
);

-- Recreate conversations policies using security definer functions
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  created_by = auth.uid() OR
  id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  created_by = auth.uid() OR
  id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);