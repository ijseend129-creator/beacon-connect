-- Create conversation_invites table
CREATE TABLE public.conversation_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.conversation_invites ENABLE ROW LEVEL SECURITY;

-- Inviter can create invites
CREATE POLICY "Users can create invites"
ON public.conversation_invites FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

-- Users can view invites they sent or received
CREATE POLICY "Users can view their invites"
ON public.conversation_invites FOR SELECT
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- Invitee can update (accept/decline) their invites
CREATE POLICY "Users can respond to their invites"
ON public.conversation_invites FOR UPDATE
USING (auth.uid() = invitee_id);

-- Enable realtime for invites
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_invites;