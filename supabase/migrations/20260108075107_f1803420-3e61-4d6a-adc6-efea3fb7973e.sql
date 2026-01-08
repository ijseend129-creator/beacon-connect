-- Create polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  multiple_choice BOOLEAN NOT NULL DEFAULT false
);

-- Create poll options table
CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll votes table
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

-- Enable RLS
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Users can view polls in their conversations"
ON public.polls FOR SELECT
USING (is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can create polls in their group conversations"
ON public.polls FOR INSERT
WITH CHECK (
  auth.uid() = creator_id 
  AND is_conversation_participant(conversation_id, auth.uid())
  AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.is_group = true)
);

-- Poll options policies
CREATE POLICY "Users can view poll options"
ON public.poll_options FOR SELECT
USING (EXISTS (
  SELECT 1 FROM polls p 
  WHERE p.id = poll_id 
  AND is_conversation_participant(p.conversation_id, auth.uid())
));

CREATE POLICY "Poll creators can add options"
ON public.poll_options FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM polls p 
  WHERE p.id = poll_id 
  AND p.creator_id = auth.uid()
));

-- Poll votes policies
CREATE POLICY "Users can view votes"
ON public.poll_votes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM polls p 
  WHERE p.id = poll_id 
  AND is_conversation_participant(p.conversation_id, auth.uid())
));

CREATE POLICY "Users can vote in polls"
ON public.poll_votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM polls p 
    WHERE p.id = poll_id 
    AND is_conversation_participant(p.conversation_id, auth.uid())
  )
);

CREATE POLICY "Users can remove their votes"
ON public.poll_votes FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for polls
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;