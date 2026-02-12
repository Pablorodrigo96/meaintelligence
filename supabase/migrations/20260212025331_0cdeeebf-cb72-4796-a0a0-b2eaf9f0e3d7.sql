CREATE TABLE public.deep_dive_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  result jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deep_dive_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own deep dive results" 
  ON public.deep_dive_results FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_deep_dive_company_user ON public.deep_dive_results(company_id, user_id);