-- Drop the broken policies
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

-- Recreate conversation_participants SELECT policy correctly
-- Use a direct check that doesn't cause recursion
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (
  user_id = auth.uid() OR
  conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
  )
);

-- Recreate conversations SELECT policy correctly
CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (
  created_by = auth.uid() OR
  id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

-- Recreate conversations UPDATE policy correctly  
CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE
USING (
  created_by = auth.uid() OR
  id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);