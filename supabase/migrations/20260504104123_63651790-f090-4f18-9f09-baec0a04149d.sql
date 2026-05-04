
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder in chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;

CREATE POLICY "Users can upload to their own folder in chat-attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can read chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view all non-expired statuses" ON public.statuses;
CREATE POLICY "Authenticated users can view non-expired statuses"
ON public.statuses FOR SELECT TO authenticated
USING (expires_at > now());

DROP POLICY IF EXISTS "Users can view poll votes" ON public.status_poll_votes;
CREATE POLICY "Status owners and voters can view poll votes"
ON public.status_poll_votes FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.statuses s
    WHERE s.id = status_poll_votes.status_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can vote on polls" ON public.status_poll_votes;
CREATE POLICY "Authenticated users can vote on polls"
ON public.status_poll_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "User achievements are viewable by authenticated users" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view all stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats"
ON public.user_stats FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Creator can update conversation"
ON public.conversations FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());
