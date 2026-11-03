import { getMethod, type H3Event } from 'h3'
import { hasPaidAccess, type User } from '../core/auth.ts'
import { configuration, freeExamMax } from '../core/config.ts'
import { getDatabase, query, type Database } from '../core/db.ts'
import { fail } from '../core/errors.ts'
import { questionVisibility } from './learning.ts'
import { achievementStatus } from '../../shared/achievement.ts'
import type { AchievementQuestion, AchievementReport } from '../../shared/types/achievement.ts'

export async function getAchievementReport(user: User | null, db: Database = getDatabase()): Promise<{ data: AchievementReport }> {
  if (!user) fail(401, 'unauthorized', 'ログインが必要です')
  const full = await hasPaidAccess(user, db)
  // A single statement keeps the denominator and history at the same snapshot.
  // Read two current-version results per question, never question/answer content.
  const rows = await query<AchievementQuestion & { exam_title: string | null }>(`
    SELECT q.id,q.exam_number,q.question_number,q.answer_type,g.group_number,q.group_question_number,
      es.title AS exam_title,COALESCE(h.results,'[]'::jsonb) AS recent_results
    FROM questions q
    LEFT JOIN exam_sets es ON es.exam_number=q.exam_number
    LEFT JOIN question_groups g ON g.id=q.group_id
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(recent.is_correct ORDER BY recent.created_at DESC,recent.id DESC) AS results
      FROM (SELECT ah.id,ah.is_correct,ah.created_at FROM answer_histories ah
        WHERE ah.user_id=$1 AND ah.question_id=q.id AND ah.question_version=q.content_version AND ah.answer_type=q.answer_type
        ORDER BY ah.created_at DESC,ah.id DESC LIMIT 2) recent
    ) h ON true
    WHERE ${questionVisibility('q')} AND q.exam_number BETWEEN 1 AND $3 AND ($2::boolean OR q.exam_number<=$4)
    ORDER BY q.exam_number,COALESCE(g.group_number,0),COALESCE(q.group_question_number,q.question_number),q.question_number,q.id
  `, [user!.id, full, configuration.exam.set_count, freeExamMax], db)
  const exams: AchievementReport['exams'] = []
  let answered = 0
  for (const row of rows) {
    let exam = exams.at(-1)
    if (exam?.exam_number !== Number(row.exam_number)) {
      exam = { exam_number: Number(row.exam_number), title: row.exam_title || `模擬試験${row.exam_number}`, questions: [] }
      exams.push(exam)
    }
    if (row.recent_results.length) answered++
    exam!.questions.push({ id: Number(row.id), exam_number: Number(row.exam_number), question_number: Number(row.question_number),
      group_number: row.group_number === null ? null : Number(row.group_number),
      group_question_number: row.group_question_number === null ? null : Number(row.group_question_number),
      answer_type: row.answer_type, recent_results: row.recent_results, status: achievementStatus(row.recent_results) })
  }
  return { data: { exams, total_count: rows.length, answered_count: answered, full_access: full } }
}

export async function handleAchievement(event: H3Event, parts: string[], user: User | null) {
  if (getMethod(event) === 'GET' && parts.join('/') === 'me/achievement') return getAchievementReport(user)
  return undefined
}
