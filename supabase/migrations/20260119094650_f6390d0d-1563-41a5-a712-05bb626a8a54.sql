-- Create budget_limits table
CREATE TABLE public.budget_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL,
  alert_threshold NUMERIC NOT NULL DEFAULT 80, -- percentage to trigger warning
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.budget_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own budgets"
ON public.budget_limits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
ON public.budget_limits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
ON public.budget_limits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
ON public.budget_limits FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_budget_limits_updated_at
BEFORE UPDATE ON public.budget_limits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();