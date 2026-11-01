import type { EssayGrade } from './essay.ts'
export type AttemptItem = { id: number; exam_number: number; question_number: number; question_version: number; group_id: number | null; group_number: number | null; group_question_number: number | null; answer_type: 'single_choice' | 'short_text' | 'essay'; points: number; profile_digest: string | null }
export type AttemptAnswer = { is_correct: boolean | null; essay_result?: EssayGrade | null; [key: string]: unknown }
export type AttemptManifest = { items: AttemptItem[]; scoring_version: string; full_exams: number[] }
export type PracticeAttempt = { id: string; status: 'active' | 'completed' | 'invalidated'; guest: boolean; manifest: AttemptManifest; answers: Record<string, AttemptAnswer>; started_at: string; completed_at: string | null }
