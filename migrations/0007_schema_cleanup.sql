ALTER TABLE courses DROP COLUMN pre_and_corequisites;

DROP TABLE IF EXISTS course_connections;

DROP INDEX IF EXISTS idx_courses_pid;
DROP INDEX IF EXISTS idx_schedules_token;
DROP INDEX IF EXISTS idx_schedule_shares_schedule_id;
