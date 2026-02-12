
ALTER TABLE companies ADD COLUMN state text;
ALTER TABLE companies ADD COLUMN city text;
ALTER TABLE companies ADD COLUMN latitude numeric;
ALTER TABLE companies ADD COLUMN longitude numeric;

ALTER TABLE match_criteria ADD COLUMN geo_reference_city text;
ALTER TABLE match_criteria ADD COLUMN geo_radius_km numeric;
ALTER TABLE match_criteria ADD COLUMN geo_latitude numeric;
ALTER TABLE match_criteria ADD COLUMN geo_longitude numeric;
