import { query, transaction, type Database } from '../core/db.ts'
import { configuration } from '../core/config.ts'
import { fail } from '../core/errors.ts'
import { LEARNING_WRITE_LOCK, validateExamSet } from './learning-structure.ts'

/** A preflight token includes the contents, IDs, publication state and edit versions. */
export async function examSetContentsFingerprint(numbers: number[], db: Database): Promise<string> {
  const [row] = await query<{ fingerprint: string }>(`WITH
    sets AS (SELECT * FROM exam_sets WHERE exam_number=ANY($1::int[])),
    groups AS (SELECT * FROM question_groups WHERE exam_number=ANY($1::int[])),
    qs AS (SELECT * FROM questions WHERE exam_number=ANY($1::int[]))
    SELECT md5(jsonb_build_object(
      'sets',(SELECT jsonb_agg(to_jsonb(s) ORDER BY exam_number) FROM sets s),
      'groups',(SELECT jsonb_agg(to_jsonb(g) ORDER BY id) FROM groups g),
      'questions',(SELECT jsonb_agg(to_jsonb(q) ORDER BY id) FROM qs q),
      'passages',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM group_passages p JOIN groups g ON g.id=p.group_id),
      'choices',(SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM question_choices c JOIN qs q ON q.id=c.question_id),
      'topics',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.question_id,t.major_category_code,t.category_code) FROM question_topic_links t JOIN qs q ON q.id=t.question_id),
      'references',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM question_passage_references r JOIN qs q ON q.id=r.question_id)
    )::text) AS fingerprint`, [numbers], db)
  return row!.fingerprint
}

/** Swap complete mock contents while keeping each numbered slot's publication state/title.
 * No content/answer versions or stable IDs change. The preflight token prevents retries
 * from toggling the sets back. A supplied db must belong to the caller's transaction.
 */
export async function swapExamSetContents(
  input: { pairs: [number, number][]; expected_fingerprint: string },
  options: { db?: Database } = {},
): Promise<{ moved_questions: number; moved_groups: number }> {
  if (!Array.isArray(input?.pairs) || !input.pairs.length || input.pairs.some(p => !Array.isArray(p) || p.length !== 2)) {
    fail(422, 'validation_error', '入れ替える教材の組を指定してください')
  }
  const numbers = input.pairs.flat()
  if (new Set(numbers).size !== numbers.length || numbers.some(n => !Number.isSafeInteger(n) || n < 1 || n > configuration.exam.set_count)
    || !/^[a-f0-9]{32}$/.test(input.expected_fingerprint ?? '')) {
    fail(422, 'validation_error', '教材番号と変更前の確認値を指定してください')
  }
  return transaction(async db => {
    await query('SELECT pg_advisory_xact_lock($1)', [LEARNING_WRITE_LOCK], db)
    const sets = await query<{ exam_number: number; publication_status: string; format_code: string }>(
      'SELECT * FROM exam_sets WHERE exam_number=ANY($1::int[]) ORDER BY exam_number FOR UPDATE', [numbers], db)
    if (await examSetContentsFingerprint(numbers, db) !== input.expected_fingerprint) {
      fail(409, 'content_conflict', '教材が変更されています。入れ替え前の状態を再確認してください')
    }
    if (sets.length !== numbers.length || sets.some(s => s.format_code !== 'rekiken_mock' || !['draft', 'published'].includes(s.publication_status))) {
      fail(422, 'validation_error', '完成した公開又は下書きの模擬試験を指定してください')
    }
    // Existing session triggers clear answers on membership changes. Refuse the move
    // if it would discard an active/completed session, including one started after preflight.
    const [attempts] = await query<{ count: number }>("SELECT count(*)::int AS count FROM practice_attempts WHERE exams && $1::int[] AND status<>'invalidated'", [numbers], db)
    if (attempts!.count) fail(409, 'exam_attempts_exist', '対象模試の演習セッションがあるため入れ替えできません')
    const [mixed] = await query<{ count: number }>(`SELECT (
      (SELECT count(*) FROM question_groups g JOIN exam_sets e USING(exam_number) WHERE g.exam_number=ANY($1::int[]) AND g.publication_status<>e.publication_status) +
      (SELECT count(*) FROM questions q JOIN exam_sets e USING(exam_number) WHERE q.exam_number=ANY($1::int[]) AND q.publication_status<>e.publication_status)
    )::int AS count`, [numbers], db)
    if (mixed!.count) fail(422, 'validation_error', '公開状態が混在する教材は個別に確認してください')
    for (const n of numbers) {
      const report = await validateExamSet(n, db)
      if (!report.valid) fail(422, 'validation_error', '入れ替え前の模試構成を確認してください')
    }
    const groups = await query<{ id: number; exam_number: number; group_number: number }>('SELECT id,exam_number,group_number FROM question_groups WHERE exam_number=ANY($1::int[]) ORDER BY id', [numbers], db)
    const questions = await query<{ id: number; exam_number: number; question_number: number }>('SELECT id,exam_number,question_number FROM questions WHERE exam_number=ANY($1::int[]) ORDER BY id', [numbers], db)
    const shifted = input.pairs.map(p => p[1])
    const groupOffset = Math.max(...groups.map(g => Number(g.group_number))) + 1
    const questionOffset = Math.max(...questions.map(q => Number(q.question_number))) + 1
    const shiftedGroupIds = groups.filter(g => shifted.includes(Number(g.exam_number))).map(g => g.id)
    const shiftedQuestionIds = questions.filter(q => shifted.includes(Number(q.exam_number))).map(q => q.id)
    await query('UPDATE question_groups SET group_number=group_number+$1 WHERE id=ANY($2::bigint[])', [groupOffset, shiftedGroupIds], db)
    await query('UPDATE questions SET question_number=question_number+$1 WHERE id=ANY($2::bigint[])', [questionOffset, shiftedQuestionIds], db)
    const from = input.pairs.flatMap(([a, b]) => [a, b])
    const to = input.pairs.flatMap(([a, b]) => [b, a])
    // Update both sides of the composite FK in ONE statement. NO ACTION FK checks
    // run at statement end; offsets avoid immediate unique-index collisions.
    await query(`WITH mapping AS (SELECT * FROM unnest($1::int[],$2::int[]) AS m(src,dst)),
      moved_groups AS (
        UPDATE question_groups g SET exam_number=m.dst,publication_status=e.publication_status,
          lock_version=g.lock_version+1,updated_at=NOW()
        FROM mapping m JOIN exam_sets e ON e.exam_number=m.dst WHERE g.exam_number=m.src RETURNING g.id
      )
      UPDATE questions q SET exam_number=m.dst,publication_status=e.publication_status,
        answer_type_locked=q.answer_type_locked OR e.publication_status='published',
        lock_version=q.lock_version+1,updated_at=NOW()
      FROM mapping m JOIN exam_sets e ON e.exam_number=m.dst WHERE q.exam_number=m.src`, [from, to], db)
    await query('UPDATE question_groups SET group_number=group_number-$1 WHERE id=ANY($2::bigint[])', [groupOffset, shiftedGroupIds], db)
    await query('UPDATE questions SET question_number=question_number-$1 WHERE id=ANY($2::bigint[])', [questionOffset, shiftedQuestionIds], db)
    await query('UPDATE exam_sets SET lock_version=lock_version+1,updated_at=NOW() WHERE exam_number=ANY($1::int[])', [numbers], db)
    for (const n of numbers) {
      const report = await validateExamSet(n, db, configuration, { publishedOnly: sets.find(s => Number(s.exam_number) === n)!.publication_status === 'published' })
      if (!report.valid) fail(422, 'validation_error', '入れ替え後の模試構成を確認してください')
    }
    return { moved_questions: questions.length, moved_groups: groups.length }
  }, options.db)
}
