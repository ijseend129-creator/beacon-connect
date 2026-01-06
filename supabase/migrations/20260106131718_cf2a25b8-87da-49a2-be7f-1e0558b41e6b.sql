-- Create calls table for signaling
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'declined', 'missed')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_signals table for WebRTC signaling
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for calls - participants can view/create/update calls in their conversations
CREATE POLICY "Users can view calls in their conversations"
ON public.calls FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = calls.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create calls in their conversations"
ON public.calls FOR INSERT
WITH CHECK (
  auth.uid() = caller_id AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = calls.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update calls in their conversations"
ON public.calls FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = calls.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- RLS policies for call_signals
CREATE POLICY "Users can view signals for calls in their conversations"
ON public.call_signals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calls c
    JOIN public.conversation_participants cp ON cp.conversation_id = c.conversation_id
    WHERE c.id = call_signals.call_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create signals for calls in their conversations"
ON public.call_signals FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.calls c
    JOIN public.conversation_participants cp ON cp.conversation_id = c.conversation_id
    WHERE c.id = call_signals.call_id
    AND cp.user_id = auth.uid()
  )
);

-- Enable realtime for calls
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;