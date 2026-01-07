-- Add avatar_url column to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for conversation avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('conversation-avatars', 'conversation-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload avatars for conversations they participate in
CREATE POLICY "Users can upload conversation avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'conversation-avatars' AND
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id::text = (storage.foldername(name))[1]
    AND cp.user_id = auth.uid()
  )
);

-- Allow anyone to view conversation avatars (public bucket)
CREATE POLICY "Anyone can view conversation avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'conversation-avatars');

-- Allow participants to update/delete conversation avatars
CREATE POLICY "Users can update conversation avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'conversation-avatars' AND
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id::text = (storage.foldername(name))[1]
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete conversation avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'conversation-avatars' AND
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id::text = (storage.foldername(name))[1]
    AND cp.user_id = auth.uid()
  )
);