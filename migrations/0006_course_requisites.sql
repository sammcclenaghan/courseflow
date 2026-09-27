-- Requisites parsed from Kuali, as JSON:
-- { prerequisites, preOrCorequisites, corequisites, recommendations }.
-- Replaces pre_and_corequisites, which is dropped once nothing reads it.
ALTER TABLE courses ADD COLUMN requisites TEXT CHECK (requisites IS NULL OR json_valid(requisites));
