-- Publication fixes the answer format even after a question returns to draft.
-- Previous publication of an existing draft/private question cannot be inferred;
-- only its current published status is backfilled.
ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_type_locked boolean NOT NULL DEFAULT false;
UPDATE questions SET answer_type_locked=true WHERE publication_status='published';
