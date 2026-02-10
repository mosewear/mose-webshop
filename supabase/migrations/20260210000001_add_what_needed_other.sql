-- Add what_needed_other column to survey_responses table
ALTER TABLE survey_responses
ADD COLUMN IF NOT EXISTS what_needed_other TEXT;

