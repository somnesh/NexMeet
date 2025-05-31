ALTER TABLE summaries
ALTER COLUMN summary TYPE jsonb USING summary::jsonb;
