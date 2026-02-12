
CREATE TABLE public.dd_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  category text NOT NULL,
  item_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  severity text NOT NULL DEFAULT 'medium',
  responsible text,
  due_date date,
  notes text,
  document_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dd_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dd checklist items"
  ON public.dd_checklist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.dd_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint,
  category text NOT NULL,
  checklist_item_id uuid,
  ai_analysis text,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dd_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dd documents"
  ON public.dd_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_dd_checklist_items_updated_at
  BEFORE UPDATE ON public.dd_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
