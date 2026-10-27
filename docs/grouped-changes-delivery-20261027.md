# 大問対応・演習表示・作問基準の送信記録

対象日: 2026年10月27日（UTC）。ユーザーの「ここまでの変更をコミットしてpushしてください」による送信作業。コードと文書が対象で、実問題DBの配布・本番反映は含まない。

## 対象

大問/共通本文/語句記述/横断分類と管理・演習・運用、本文と設問の直列表示、同じ本文の保持と先頭移動、お気に入り位置、語句記述の選定・原典照合基準、関連する設計・検証・引き継ぎを送信する。機能と変更ファイルの詳細は[大問実装](grouped-question-implementation-20261027.md)、[問題登録](question-registration-20261027.md)、[追加変更](interaction-and-content-update-20261027.md)を参照。

過去問・用語集・原画像/全文OCR・分類全文・新旧原稿/照合/DB控えを含むlocal-onlyは除外する。既存の「 2」コピー10件は手元に保持し、送信しない。問題・DB・認証情報はこの送信作業で変更しない。

## 送信前の確認

- mainとorigin/mainは取得時に差分0/0。通常のコミット/pushを使い、履歴書換え/強制pushは行わない。
- Netlifyの現在のチーム一覧には世界史ラボのプロジェクト登録がなく、表示された既存の別プロジェクトはBuilds are stopped。世界史ラボ固有の停止設定を確認できたという意味ではない。設定変更・再開・手動デプロイは行わず、すべてのコミットへ`[skip netlify]`を付ける。
- 機能実装後のサーバー82件、本文保持等の最終フロント97件・型検査/build・最終SFC・PC/SP/実APIと独立レビューは先行作業の実ログを再読。送信段階でこれらを再実行したとは扱わない。コードはその後変更せず、今回の設定/原資料全履歴保護/進捗の軽量検査とstage集合を確認する。
- `.githooks`を維持し、NUL区切りの明示パスでstageする。独立担当が送信対象・除外・検査根拠をレビューする。

## 状態

送信前検査・独立レビューを進行中。コミット/pushとCIの結果は実施後に追記する。詳細な機械記録はローカル専用の`local-only/grouped-delivery-20261027/`。

## 送信対象ファイル

- [AGENTS.md](../AGENTS.md): 実装・作問・原典照合の確定基準。
- [README.md](../README.md): 設計・運用・検証・現在地の関連記録。
- [config/exam.json](../config/exam.json): 教材形式・構成・検査条件。
- [docs/architecture.md](architecture.md): 設計・運用・検証・現在地の関連記録。
- [docs/customization.md](customization.md): 設計・運用・検証・現在地の関連記録。
- [docs/grouped-question-design-20261027.md](grouped-question-design-20261027.md): 設計・運用・検証・現在地の関連記録。
- [docs/grouped-question-implementation-20261027.md](grouped-question-implementation-20261027.md): 設計・運用・検証・現在地の関連記録。
- [docs/interaction-and-content-update-20261027.md](interaction-and-content-update-20261027.md): 設計・運用・検証・現在地の関連記録。
- [docs/question-registration-20261027.md](question-registration-20261027.md): 設計・運用・検証・現在地の関連記録。
- [docs/verification.md](verification.md): 設計・運用・検証・現在地の関連記録。
- [docs/workflow/contexts/product.md](workflow/contexts/product.md): 設計・運用・検証・現在地の関連記録。
- [docs/workflow/contexts/service.md](workflow/contexts/service.md): 設計・運用・検証・現在地の関連記録。
- [docs/workflow/handoffs/2026-10-27T06-10-51-622Z-r39.json](workflow/handoffs/2026-10-27T06-10-51-622Z-r39.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T06-10-53-220Z-r40.json](workflow/handoffs/2026-10-27T06-10-53-220Z-r40.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T07-40-46-509Z-r41.json](workflow/handoffs/2026-10-27T07-40-46-509Z-r41.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T07-41-42-559Z-r42.json](workflow/handoffs/2026-10-27T07-41-42-559Z-r42.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T07-41-43-902Z-r43.json](workflow/handoffs/2026-10-27T07-41-43-902Z-r43.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T08-35-09-722Z-r44.json](workflow/handoffs/2026-10-27T08-35-09-722Z-r44.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T08-44-44-568Z-r45.json](workflow/handoffs/2026-10-27T08-44-44-568Z-r45.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T08-47-16-105Z-r46.json](workflow/handoffs/2026-10-27T08-47-16-105Z-r46.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T08-47-17-212Z-r47.json](workflow/handoffs/2026-10-27T08-47-17-212Z-r47.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T09-40-21-142Z-r48.json](workflow/handoffs/2026-10-27T09-40-21-142Z-r48.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T09-57-44-047Z-r49.json](workflow/handoffs/2026-10-27T09-57-44-047Z-r49.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T10-05-52-637Z-r50.json](workflow/handoffs/2026-10-27T10-05-52-637Z-r50.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T10-27-13-539Z-r51.json](workflow/handoffs/2026-10-27T10-27-13-539Z-r51.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T10-27-16-925Z-r52.json](workflow/handoffs/2026-10-27T10-27-16-925Z-r52.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T10-27-43-499Z-r53.json](workflow/handoffs/2026-10-27T10-27-43-499Z-r53.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T10-35-46-805Z-r54.json](workflow/handoffs/2026-10-27T10-35-46-805Z-r54.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T10-43-40-684Z-r55.json](workflow/handoffs/2026-10-27T10-43-40-684Z-r55.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T10-43-42-016Z-r56.json](workflow/handoffs/2026-10-27T10-43-42-016Z-r56.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T12-24-17-603Z-r57.json](workflow/handoffs/2026-10-27T12-24-17-603Z-r57.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T12-24-18-553Z-r58.json](workflow/handoffs/2026-10-27T12-24-18-553Z-r58.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T12-54-49-944Z-r59.json](workflow/handoffs/2026-10-27T12-54-49-944Z-r59.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-08-17-248Z-r60.json](workflow/handoffs/2026-10-27T13-08-17-248Z-r60.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-16-55-110Z-r61.json](workflow/handoffs/2026-10-27T13-16-55-110Z-r61.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-21-24-827Z-r62.json](workflow/handoffs/2026-10-27T13-21-24-827Z-r62.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-21-25-636Z-r63.json](workflow/handoffs/2026-10-27T13-21-25-636Z-r63.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-21-26-409Z-r64.json](workflow/handoffs/2026-10-27T13-21-26-409Z-r64.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-21-27-426Z-r65.json](workflow/handoffs/2026-10-27T13-21-27-426Z-r65.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-21-28-061Z-r66.json](workflow/handoffs/2026-10-27T13-21-28-061Z-r66.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/handoffs/2026-10-27T13-21-29-424Z-r67.json](workflow/handoffs/2026-10-27T13-21-29-424Z-r67.json): 当時の評価・引き継ぎ記録。
- [docs/workflow/state.json](workflow/state.json): 設計・運用・検証・現在地の関連記録。
- [frontend/app/components/ExamSidebar.vue](../frontend/app/components/ExamSidebar.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/QuestionAnswerForm.vue](../frontend/app/components/QuestionAnswerForm.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/QuestionContentBlocks.vue](../frontend/app/components/QuestionContentBlocks.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/QuestionInlineText.vue](../frontend/app/components/QuestionInlineText.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/SharedPassagePanel.vue](../frontend/app/components/SharedPassagePanel.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/admin/AdminContentBlockEditor.vue](../frontend/app/components/admin/AdminContentBlockEditor.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/admin/AdminQuestionForm.vue](../frontend/app/components/admin/AdminQuestionForm.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/admin/AdminQuestionPreview.vue](../frontend/app/components/admin/AdminQuestionPreview.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/components/admin/AdminSourceEditor.vue](../frontend/app/components/admin/AdminSourceEditor.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/composables/usePublicExamCatalog.ts](../frontend/app/composables/usePublicExamCatalog.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/layouts/admin.vue](../frontend/app/layouts/admin.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/admin/exams/[examNumber].vue](../frontend/app/pages/admin/exams/[examNumber].vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/admin/exams/index.vue](../frontend/app/pages/admin/exams/index.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/admin/questions/[questionId]/edit.vue](../frontend/app/pages/admin/questions/[questionId]/edit.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/admin/questions/new.vue](../frontend/app/pages/admin/questions/new.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/exam-overview.vue](../frontend/app/pages/exam-overview.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/favorites.vue](../frontend/app/pages/favorites.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/history.vue](../frontend/app/pages/history.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/index.vue](../frontend/app/pages/index.vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](../frontend/app/pages/practice/[examNumber]/[questionNumber].vue): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/types/adminQuestion.ts](../frontend/app/types/adminQuestion.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/utils/adminQuestionForm.ts](../frontend/app/utils/adminQuestionForm.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/utils/examCatalog.ts](../frontend/app/utils/examCatalog.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/utils/learningPresentation.ts](../frontend/app/utils/learningPresentation.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/utils/practicePassageState.ts](../frontend/app/utils/practicePassageState.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/app/utils/practiceSequence.ts](../frontend/app/utils/practiceSequence.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/server-tests/api.test.ts](../frontend/server-tests/api.test.ts): 対応機能の回帰検査。
- [frontend/server-tests/archive-optional.test.ts](../frontend/server-tests/archive-optional.test.ts): 対応機能の回帰検査。
- [frontend/server-tests/content-v2.test.ts](../frontend/server-tests/content-v2.test.ts): 対応機能の回帰検査。
- [frontend/server-tests/grouped-learning.test.ts](../frontend/server-tests/grouped-learning.test.ts): 対応機能の回帰検査。
- [frontend/server-tests/learning.test.ts](../frontend/server-tests/learning.test.ts): 対応機能の回帰検査。
- [frontend/server-tests/operations.test.ts](../frontend/server-tests/operations.test.ts): 対応機能の回帰検査。
- [frontend/server/database/migrations/005_grouped_questions.sql](../frontend/server/database/migrations/005_grouped_questions.sql): 既存IDを保持する番号付き構造追加/回答形式固定。
- [frontend/server/database/migrations/006_lock_published_answer_types.sql](../frontend/server/database/migrations/006_lock_published_answer_types.sql): 既存IDを保持する番号付き構造追加/回答形式固定。
- [frontend/server/operations/archive-common.ts](../frontend/server/operations/archive-common.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/server/operations/content-v2.ts](../frontend/server/operations/content-v2.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/server/operations/content.ts](../frontend/server/operations/content.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/server/operations/restore-drill.ts](../frontend/server/operations/restore-drill.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/server/services/learning-structure.ts](../frontend/server/services/learning-structure.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/server/services/learning-validation.ts](../frontend/server/services/learning-validation.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/server/services/learning-writer.ts](../frontend/server/services/learning-writer.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/server/services/learning.ts](../frontend/server/services/learning.ts): 公開/採点/管理/保存/運用の大問・短答対応。
- [frontend/shared/examConfig.ts](../frontend/shared/examConfig.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/shared/types/learning.ts](../frontend/shared/types/learning.ts): 管理/演習と表示/入力/条件の大問対応。
- [frontend/tests/adminGroupedQuestion.test.ts](../frontend/tests/adminGroupedQuestion.test.ts): 対応機能の回帰検査。
- [frontend/tests/examConfig.test.ts](../frontend/tests/examConfig.test.ts): 対応機能の回帰検査。
- [frontend/tests/examSidebarLayout.test.ts](../frontend/tests/examSidebarLayout.test.ts): 対応機能の回帰検査。
- [frontend/tests/groupedLearningPresentation.test.ts](../frontend/tests/groupedLearningPresentation.test.ts): 対応機能の回帰検査。
- [frontend/tests/practicePassageState.test.ts](../frontend/tests/practicePassageState.test.ts): 対応機能の回帰検査。
- [scripts/check-template.mjs](../scripts/check-template.mjs): 設計・運用・検証・現在地の関連記録。
- [docs/grouped-changes-delivery-20261027.md](grouped-changes-delivery-20261027.md): 設計・運用・検証・現在地の関連記録。

- [docs/workflow/handoffs/2026-10-27T13-40-38-249Z-r68.json](workflow/handoffs/2026-10-27T13-40-38-249Z-r68.json): 今回の送信依頼と事前検査の開始記録。
