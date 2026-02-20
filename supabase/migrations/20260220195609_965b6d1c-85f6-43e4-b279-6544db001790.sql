CREATE TABLE public.match_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  action_type text NOT NULL,
  rank_position integer,
  rejection_reason text,
  criteria_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON public.match_feedback FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);