-- Add view_once column to messages table
ALTER TABLE public.messages 
ADD COLUMN view_once BOOLEAN NOT NULL DEFAULT false;

-- Create table to track who has viewed view_once messages
CREATE TABLE public.message_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own views
CREATE POLICY "Users can view their own message views"
ON public.message_views
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own views
CREATE POLICY "Users can insert their own message views"
ON public.message_views
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for message_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_views;