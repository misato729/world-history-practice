-- Topic flags cross the chapter/section taxonomy. Art history is a subset of cultural history.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_cultural_history boolean NOT NULL DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_art_history boolean NOT NULL DEFAULT false;

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'questions'::regclass AND conname = 'questions_art_history_requires_cultural_history') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_art_history_requires_cultural_history
      CHECK (NOT is_art_history OR is_cultural_history);
  END IF;
END $constraints$;

CREATE INDEX IF NOT EXISTS index_questions_cultural_history_for_practice
  ON questions(exam_number, question_number) WHERE publication_status = 'published' AND is_cultural_history;
CREATE INDEX IF NOT EXISTS index_questions_art_history_for_practice
  ON questions(exam_number, question_number) WHERE publication_status = 'published' AND is_art_history;
