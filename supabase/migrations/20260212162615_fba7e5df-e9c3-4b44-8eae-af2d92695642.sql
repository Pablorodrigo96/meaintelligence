
-- Create PMI activities table
CREATE TABLE public.pmi_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  group_name text NOT NULL,
  discipline text NOT NULL,
  area text NOT NULL,
  milestone text NOT NULL,
  activity text NOT NULL,
  deadline text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pmi_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own PMI activities"
ON public.pmi_activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PMI activities"
ON public.pmi_activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PMI activities"
ON public.pmi_activities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own PMI activities"
ON public.pmi_activities FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_pmi_activities_updated_at
BEFORE UPDATE ON public.pmi_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
