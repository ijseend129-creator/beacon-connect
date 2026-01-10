-- Allow users to delete their own conversation participation (leave conversation)
CREATE POLICY "Users can leave conversations"
ON public.conversation_participants
FOR DELETE
USING (user_id = auth.uid());