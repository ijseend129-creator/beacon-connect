-- Create statuses table
CREATE TABLE public.statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT, -- 'image', 'audio', 'poll'
  poll_question TEXT,
  poll_options JSONB, -- Array of poll option strings
  background_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create status views table to track who has seen a status
CREATE TABLE public.status_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(status_id, viewer_id)
);

-- Create status poll votes table
CREATE TABLE public.status_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(status_id, user_id)
);

-- Enable RLS
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for statuses
CREATE POLICY "Users can view all non-expired statuses"
ON public.statuses
FOR SELECT
USING (expires_at > now());

CREATE POLICY "Users can create their own statuses"
ON public.statuses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statuses"
ON public.statuses
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for status_views
CREATE POLICY "Status owners can view who saw their status"
ON public.status_views
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.statuses s
  WHERE s.id = status_views.status_id AND s.user_id = auth.uid()
) OR viewer_id = auth.uid());

CREATE POLICY "Users can mark statuses as viewed"
ON public.status_views
FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- RLS Policies for status_poll_votes
CREATE POLICY "Users can view poll votes"
ON public.status_poll_votes
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.statuses s
  WHERE s.id = status_poll_votes.status_id AND expires_at > now()
));

CREATE POLICY "Users can vote on polls"
ON public.status_poll_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for statuses
ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_views;