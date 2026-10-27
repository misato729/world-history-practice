-- Add grouped materials without replacing any existing question or choice IDs.
CREATE TABLE IF NOT EXISTS exam_sets (
  exam_number integer PRIMARY KEY CHECK (exam_number > 0), title text NOT NULL DEFAULT '',
  format_code text NOT NULL DEFAULT 'legacy_practice' CHECK (format_code IN ('legacy_practice','group_practice','rekiken_mock')),
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','private')),
  lock_version integer NOT NULL DEFAULT 1 CHECK (lock_version > 0),
  created_at timestamp(6) NOT NULL DEFAULT NOW(), updated_at timestamp(6) NOT NULL DEFAULT NOW()
);
INSERT INTO exam_sets(exam_number,title,format_code,publication_status)
 SELECT exam_number,'教材 ' || exam_number,'legacy_practice',CASE WHEN bool_or(publication_status='published') THEN 'published' ELSE 'draft' END
 FROM questions GROUP BY exam_number ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS question_groups (
  id bigserial PRIMARY KEY, exam_number integer NOT NULL REFERENCES exam_sets(exam_number) ON DELETE RESTRICT,
  group_number integer NOT NULL CHECK (group_number > 0), title text NOT NULL DEFAULT '',
  planned_question_count integer NOT NULL CHECK (planned_question_count IN (7,8)),
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','private')),
  lock_version integer NOT NULL DEFAULT 1 CHECK (lock_version > 0),
  created_at timestamp(6) NOT NULL DEFAULT NOW(), updated_at timestamp(6) NOT NULL DEFAULT NOW(),
  UNIQUE(exam_number,group_number), UNIQUE(id,exam_number)
);
CREATE TABLE IF NOT EXISTS group_passages (
  id bigserial PRIMARY KEY, group_id bigint NOT NULL REFERENCES question_groups(id) ON DELETE RESTRICT,
  label text NOT NULL, display_order integer NOT NULL CHECK (display_order > 0),
  content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp(6) NOT NULL DEFAULT NOW(), updated_at timestamp(6) NOT NULL DEFAULT NOW(),
  UNIQUE(group_id,label), UNIQUE(group_id,display_order), UNIQUE(id,group_id)
);
ALTER TABLE questions ADD COLUMN IF NOT EXISTS group_id bigint;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS group_question_number integer;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_type text NOT NULL DEFAULT 'single_choice';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS accepted_answers jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS input_constraints jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_references jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS content_version integer NOT NULL DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 1;
-- Only pre-migration questions may accept the old answer request without a version.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS legacy_answer_compatible boolean NOT NULL DEFAULT true;
ALTER TABLE questions ALTER COLUMN legacy_answer_compatible SET DEFAULT false;
ALTER TABLE questions ADD CONSTRAINT questions_group_membership CHECK (
 (group_id IS NULL AND group_question_number IS NULL) OR (group_id IS NOT NULL AND group_question_number IS NOT NULL AND group_question_number > 0));
ALTER TABLE questions ADD CONSTRAINT questions_answer_type_valid CHECK (answer_type IN ('single_choice','short_text'));
ALTER TABLE questions ADD CONSTRAINT questions_versions_positive CHECK (content_version > 0 AND lock_version > 0);
ALTER TABLE questions ADD CONSTRAINT questions_group_set_fk FOREIGN KEY(group_id,exam_number) REFERENCES question_groups(id,exam_number) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS index_questions_group_number ON questions(group_id,group_question_number) WHERE group_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS question_topic_links (
  question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  major_category_code text NOT NULL, category_code text NOT NULL,
  PRIMARY KEY(question_id,major_category_code,category_code)
);
INSERT INTO question_topic_links(question_id,major_category_code,category_code)
 SELECT id,major_category_code,category_code FROM questions ON CONFLICT DO NOTHING;
CREATE INDEX IF NOT EXISTS index_question_topic_codes ON question_topic_links(major_category_code,category_code,question_id);
CREATE TABLE IF NOT EXISTS question_passage_references (
  id bigserial PRIMARY KEY, question_id bigint NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  passage_id bigint NOT NULL REFERENCES group_passages(id) ON DELETE RESTRICT,
  anchor_id text,
  UNIQUE NULLS NOT DISTINCT (question_id,passage_id,anchor_id)
);
ALTER TABLE answer_histories ALTER COLUMN selected_choice_id DROP NOT NULL;
ALTER TABLE answer_histories ADD COLUMN IF NOT EXISTS answer_type text NOT NULL DEFAULT 'single_choice';
ALTER TABLE answer_histories ADD COLUMN IF NOT EXISTS submitted_text text;
ALTER TABLE answer_histories ADD COLUMN IF NOT EXISTS question_version integer NOT NULL DEFAULT 1;
ALTER TABLE answer_histories ADD COLUMN IF NOT EXISTS submission_key varchar(120);
ALTER TABLE answer_histories ADD CONSTRAINT answer_histories_response_shape CHECK (
 (answer_type='single_choice' AND selected_choice_id IS NOT NULL AND submitted_text IS NULL)
 OR (answer_type='short_text' AND selected_choice_id IS NULL AND submitted_text IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS index_histories_submission_key ON answer_histories(user_id,submission_key) WHERE submission_key IS NOT NULL;
