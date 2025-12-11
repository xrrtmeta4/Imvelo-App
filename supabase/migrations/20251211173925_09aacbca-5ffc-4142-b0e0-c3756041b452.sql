-- Create table for crop reminder subscriptions
CREATE TABLE public.crop_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  planting_start_month INTEGER NOT NULL CHECK (planting_start_month >= 1 AND planting_start_month <= 12),
  planting_end_month INTEGER NOT NULL CHECK (planting_end_month >= 1 AND planting_end_month <= 12),
  reminder_sent_this_season BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, crop_name)
);

-- Enable RLS
ALTER TABLE public.crop_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own reminders"
ON public.crop_reminders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
ON public.crop_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
ON public.crop_reminders
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
ON public.crop_reminders
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_crop_reminders_updated_at
BEFORE UPDATE ON public.crop_reminders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for crop reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.crop_reminders;