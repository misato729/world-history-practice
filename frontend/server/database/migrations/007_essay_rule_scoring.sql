-- Extend response shapes atomically; do not recreate rows, IDs, keys or locks.
ALTER TABLE questions ADD COLUMN essay_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE questions DROP CONSTRAINT questions_answer_type_valid;
ALTER TABLE questions ADD CONSTRAINT questions_answer_type_valid
  CHECK (answer_type IN ('single_choice','short_text','essay'));
ALTER TABLE questions ADD CONSTRAINT questions_essay_config_shape CHECK (
  jsonb_typeof(essay_config)='object'
  AND (answer_type='essay' OR essay_config='{}'::jsonb)
  AND (essay_config='{}'::jsonb OR (
    essay_config ?& ARRAY['profile_id','profile_version','model_answer','profile_digest']
    AND essay_config - ARRAY['profile_id','profile_version','model_answer','profile_digest'] = '{}'::jsonb
    AND jsonb_typeof(essay_config->'profile_id')='string'
    AND jsonb_typeof(essay_config->'profile_version')='number'
    AND (essay_config->>'profile_version') ~ '^[1-9][0-9]*$'
    AND jsonb_typeof(essay_config->'model_answer')='string'
    AND jsonb_typeof(essay_config->'profile_digest')='string'
    AND (essay_config->>'profile_digest') ~ '^[0-9a-f]{64}$'
  ))
);
ALTER TABLE answer_histories ADD COLUMN essay_result jsonb;
ALTER TABLE answer_histories ALTER COLUMN is_correct DROP NOT NULL;
-- Replacing the type CHECK is necessary to admit essays while strengthening the
-- old two response shapes. Existing foreign keys and uniqueness remain intact.
ALTER TABLE answer_histories DROP CONSTRAINT answer_histories_response_shape;
ALTER TABLE answer_histories ADD CONSTRAINT answer_histories_response_shape CHECK (
  (answer_type='single_choice' AND selected_choice_id IS NOT NULL AND submitted_text IS NULL
    AND is_correct IS NOT NULL AND essay_result IS NULL)
  OR (answer_type='short_text' AND selected_choice_id IS NULL AND submitted_text IS NOT NULL
    AND is_correct IS NOT NULL AND essay_result IS NULL)
  OR (answer_type='essay' AND selected_choice_id IS NULL AND submitted_text IS NOT NULL
    AND is_correct IS NULL AND essay_result IS NOT NULL AND jsonb_typeof(essay_result)='object'
    AND essay_result ? 'grading_status' AND jsonb_typeof(essay_result->'grading_status')='string'
    AND essay_result->>'grading_status' IN ('complete','pending','invalid'))
);
