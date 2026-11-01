CREATE TABLE practice_attempts (
 id uuid PRIMARY KEY,
 user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','invalidated')),
 exams integer[] NOT NULL,
 manifest jsonb NOT NULL,
 answers jsonb NOT NULL DEFAULT '{}'::jsonb,
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
CREATE INDEX practice_attempts_owner ON practice_attempts(user_id,started_at DESC);
CREATE INDEX practice_attempts_exams ON practice_attempts USING gin(exams);
-- Writer transactions hold the same advisory lock as attempt operations. Only
-- material/publication/membership changes invalidate; classification/reorder do not.
CREATE FUNCTION invalidate_practice_attempts() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE affected integer[]; selected_id bigint; selected_group bigint; question_change boolean := false; membership_change boolean := false;
BEGIN
 IF TG_TABLE_NAME='questions' THEN
  question_change=true;
  IF TG_OP='DELETE' THEN membership_change=OLD.publication_status='published'; ELSIF TG_OP='INSERT' THEN membership_change=NEW.publication_status='published'; ELSE membership_change=(OLD.publication_status='published' OR NEW.publication_status='published') AND (OLD.publication_status IS DISTINCT FROM NEW.publication_status OR OLD.exam_number IS DISTINCT FROM NEW.exam_number OR OLD.group_id IS DISTINCT FROM NEW.group_id); END IF;
  IF TG_OP='DELETE' THEN selected_id=OLD.id; ELSE selected_id=NEW.id; END IF;
  IF TG_OP='UPDATE' AND OLD.content_version=NEW.content_version
   AND OLD.publication_status=NEW.publication_status AND OLD.exam_number=NEW.exam_number
   AND OLD.group_id IS NOT DISTINCT FROM NEW.group_id AND OLD.question_number=NEW.question_number THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND NEW.publication_status<>'published' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' THEN affected=ARRAY[OLD.exam_number,NEW.exam_number];
  ELSIF TG_OP='DELETE' THEN affected=ARRAY[OLD.exam_number]; ELSE affected=ARRAY[NEW.exam_number]; END IF;
 ELSE
  IF TG_TABLE_NAME='question_groups' THEN
   IF TG_OP='DELETE' THEN selected_group=OLD.id; ELSE selected_group=NEW.id; END IF;
  END IF;
  IF TG_OP='UPDATE' AND OLD.publication_status=NEW.publication_status THEN RETURN NEW; END IF;
  IF TG_OP='DELETE' THEN affected=ARRAY[OLD.exam_number]; ELSE affected=ARRAY[NEW.exam_number]; END IF;
 END IF;
 UPDATE practice_attempts SET status='invalidated',answers='{}'::jsonb WHERE status<>'invalidated' AND exams && affected
 AND (CASE WHEN question_change THEN
   manifest->'items' @> jsonb_build_array(jsonb_build_object('id',selected_id))
   OR membership_change AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(manifest->'full_exams') e WHERE e.value::integer=ANY(affected))
  WHEN selected_group IS NOT NULL THEN manifest->'items' @> jsonb_build_array(jsonb_build_object('group_id',selected_group))
  ELSE true END);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER questions_invalidate_attempts AFTER INSERT OR UPDATE OR DELETE ON questions FOR EACH ROW EXECUTE FUNCTION invalidate_practice_attempts();
CREATE TRIGGER groups_invalidate_attempts AFTER UPDATE OR DELETE ON question_groups FOR EACH ROW EXECUTE FUNCTION invalidate_practice_attempts();
CREATE TRIGGER sets_invalidate_attempts AFTER UPDATE OR DELETE ON exam_sets FOR EACH ROW EXECUTE FUNCTION invalidate_practice_attempts();
