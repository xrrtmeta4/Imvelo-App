
CREATE TABLE IF NOT EXISTS public.ussd_crop_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ussd_crop_reports_phone ON public.ussd_crop_reports(phone_number);
CREATE INDEX IF NOT EXISTS idx_ussd_crop_reports_created ON public.ussd_crop_reports(created_at DESC);

ALTER TABLE public.ussd_crop_reports ENABLE ROW LEVEL SECURITY;

-- Extension officers can view all reports
CREATE POLICY "Extension officers can view ussd crop reports"
ON public.ussd_crop_reports
FOR SELECT
TO authenticated
USING (public.is_extension_officer(auth.uid()));

-- Trigger to maintain updated_at
DROP TRIGGER IF EXISTS trg_ussd_crop_reports_updated_at ON public.ussd_crop_reports;
CREATE TRIGGER trg_ussd_crop_reports_updated_at
BEFORE UPDATE ON public.ussd_crop_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
