
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read all settings
CREATE POLICY "Admins can view settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update settings
CREATE POLICY "Admins can update settings"
  ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert settings
CREATE POLICY "Admins can insert settings"
  ON public.admin_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('two_factor_required', 'false'::jsonb),
  ('session_timeout', 'false'::jsonb),
  ('email_notifications', 'false'::jsonb),
  ('new_user_alert', 'false'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('open_signup', 'true'::jsonb);
