-- Create ledger_entries table for expense/income tracking
CREATE TABLE public.ledger_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own entries
CREATE POLICY "Users can view own ledger entries"
ON public.ledger_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ledger entries"
ON public.ledger_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ledger entries"
ON public.ledger_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ledger entries"
ON public.ledger_entries FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_ledger_entries_updated_at
BEFORE UPDATE ON public.ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();