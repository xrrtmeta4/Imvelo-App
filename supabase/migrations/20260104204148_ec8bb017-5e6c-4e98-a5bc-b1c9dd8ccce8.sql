-- Create USSD sessions table for conversation persistence
CREATE TABLE public.ussd_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  current_menu TEXT NOT NULL DEFAULT 'main',
  context JSONB DEFAULT '{}',
  last_input TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '30 minutes')
);

-- Create index for faster lookups
CREATE INDEX idx_ussd_sessions_session_id ON public.ussd_sessions(session_id);
CREATE INDEX idx_ussd_sessions_phone_number ON public.ussd_sessions(phone_number);
CREATE INDEX idx_ussd_sessions_expires_at ON public.ussd_sessions(expires_at);

-- Enable RLS
ALTER TABLE public.ussd_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "Service role can manage USSD sessions"
ON public.ussd_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_ussd_sessions_updated_at
BEFORE UPDATE ON public.ussd_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();