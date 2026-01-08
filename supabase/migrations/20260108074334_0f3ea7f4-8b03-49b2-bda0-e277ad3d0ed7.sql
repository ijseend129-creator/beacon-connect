-- Create scheduled messages table
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  view_once BOOLEAN NOT NULL DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled messages
CREATE POLICY "Users can view their own scheduled messages"
ON public.scheduled_messages
FOR SELECT
USING (auth.uid() = sender_id);

-- Users can insert their own scheduled messages
CREATE POLICY "Users can insert their own scheduled messages"
ON public.scheduled_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own scheduled messages
CREATE POLICY "Users can delete their own scheduled messages"
ON public.scheduled_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Users can update their own scheduled messages
CREATE POLICY "Users can update their own scheduled messages"
ON public.scheduled_messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- Create index for efficient querying of pending messages
CREATE INDEX idx_scheduled_messages_pending ON public.scheduled_messages(scheduled_at) 
WHERE status = 'pending';