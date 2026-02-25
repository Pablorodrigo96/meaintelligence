-- Add match_type column to prevent aggressive cleanup across search modes
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_type text DEFAULT 'target_search';

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_matches_match_type ON public.matches(match_type);
