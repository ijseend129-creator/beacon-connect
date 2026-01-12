-- Create achievements table with predefined achievements
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements table to track earned achievements
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create user_stats table to track progress
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  groups_created INTEGER NOT NULL DEFAULT 0,
  polls_created INTEGER NOT NULL DEFAULT 0,
  files_sent INTEGER NOT NULL DEFAULT 0,
  voice_messages_sent INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Achievements are viewable by everyone
CREATE POLICY "Achievements are viewable by everyone" 
ON public.achievements FOR SELECT 
USING (true);

-- Users can view all user achievements (to see on profiles)
CREATE POLICY "User achievements are viewable by authenticated users" 
ON public.user_achievements FOR SELECT 
TO authenticated
USING (true);

-- Users can insert their own achievements
CREATE POLICY "Users can earn achievements" 
ON public.user_achievements FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User stats policies
CREATE POLICY "Users can view all stats" 
ON public.user_stats FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own stats" 
ON public.user_stats FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.user_stats FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Insert predefined achievements
INSERT INTO public.achievements (key, name, description, icon, category, requirement_value, points) VALUES
-- Message milestones
('first_message', 'Eerste Woorden', 'Verstuur je eerste bericht', 'MessageSquare', 'messages', 1, 10),
('messages_10', 'Babbelaar', 'Verstuur 10 berichten', 'MessageSquare', 'messages', 10, 25),
('messages_100', 'Kletskous', 'Verstuur 100 berichten', 'MessageSquare', 'messages', 100, 50),
('messages_500', 'Prater', 'Verstuur 500 berichten', 'MessageSquare', 'messages', 500, 100),
('messages_1000', 'Woordkunstenaar', 'Verstuur 1000 berichten', 'MessageSquare', 'messages', 1000, 200),

-- Streak achievements
('streak_3', 'Beginneling', '3 dagen achter elkaar actief', 'Flame', 'streaks', 3, 25),
('streak_7', 'Trouw', '7 dagen achter elkaar actief', 'Flame', 'streaks', 7, 50),
('streak_14', 'Toegewijd', '14 dagen achter elkaar actief', 'Flame', 'streaks', 14, 100),
('streak_30', 'Fanatiekeling', '30 dagen achter elkaar actief', 'Flame', 'streaks', 30, 200),
('streak_100', 'Legende', '100 dagen achter elkaar actief', 'Flame', 'streaks', 100, 500),

-- Feature usage
('first_group', 'Groepsleider', 'Maak je eerste groep aan', 'Users', 'features', 1, 25),
('groups_5', 'Sociale Vlinder', 'Maak 5 groepen aan', 'Users', 'features', 5, 75),
('first_poll', 'Stemmer', 'Maak je eerste poll aan', 'BarChart3', 'features', 1, 25),
('polls_10', 'Democraat', 'Maak 10 polls aan', 'BarChart3', 'features', 10, 75),
('first_file', 'Deler', 'Verstuur je eerste bestand', 'File', 'features', 1, 25),
('files_25', 'Archivaris', 'Verstuur 25 bestanden', 'File', 'features', 25, 75),
('first_voice', 'Spreker', 'Verstuur je eerste spraakbericht', 'Mic', 'features', 1, 25),
('voice_20', 'Podcast Host', 'Verstuur 20 spraakberichten', 'Mic', 'features', 20, 75);

-- Enable realtime for user_achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;