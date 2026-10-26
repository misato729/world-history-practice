-- Culture has one primary category; legacy flags remain compatible projections.
-- Backfill metadata only. Do not change content, record IDs, timestamps or relations.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS cultural_history_category text;

UPDATE questions SET cultural_history_category = CASE
  WHEN is_art_history THEN 'art_history'
  WHEN is_cultural_history THEN 'other_cultural_history'
  ELSE NULL
END
WHERE cultural_history_category IS NULL AND is_cultural_history;

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'questions'::regclass AND conname = 'questions_cultural_history_category_valid') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_cultural_history_category_valid CHECK (
      (NOT is_cultural_history AND cultural_history_category IS NULL AND NOT is_art_history)
      OR
      (is_cultural_history AND cultural_history_category IS NOT NULL
        AND cultural_history_category IN ('art_history', 'music_history', 'literature_history', 'other_cultural_history')
        AND is_art_history = (cultural_history_category = 'art_history'))
    );
  END IF;
END $constraints$;

CREATE INDEX IF NOT EXISTS index_questions_cultural_history_category_for_practice
  ON questions(cultural_history_category, exam_number, question_number)
  WHERE publication_status = 'published' AND is_cultural_history;
