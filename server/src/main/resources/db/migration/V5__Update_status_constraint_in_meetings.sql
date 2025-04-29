ALTER TABLE meetings DROP CONSTRAINT IF EXISTS status_check;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;

ALTER TABLE meetings
ADD CONSTRAINT meetings_status_check
CHECK (status IN ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED'));