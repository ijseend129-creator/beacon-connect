-- Add status field to messages table for message status indicators
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent';

-- Add read tracking table for tracking read status per user per conversation
CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  last_read_message_id uuid,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS on message_reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_reads
CREATE POLICY "Users can view their own read status"
ON public.message_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read status"
ON public.message_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read status"
ON public.message_reads
FOR UPDATE
USING (auth.uid() = user_id);

-- Create offline message queue table
CREATE TABLE IF NOT EXISTS public.offline_message_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  file_name text,
  file_type text,
  client_timestamp timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  synced boolean NOT NULL DEFAULT false
);

-- Enable RLS on offline_message_queue
ALTER TABLE public.offline_message_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for offline_message_queue
CREATE POLICY "Users can view their own queued messages"
ON public.offline_message_queue
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queued messages"
ON public.offline_message_queue
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queued messages"
ON public.offline_message_queue
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queued messages"
ON public.offline_message_queue
FOR DELETE
USING (auth.uid() = user_id);

-- Add typing_at column to conversation_participants for typing indicators
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS typing_at timestamp with time zone;

-- Enable realtime for conversation_participants and message_reads (messages already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;