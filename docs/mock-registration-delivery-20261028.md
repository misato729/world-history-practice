# 模擬試験6セットの登録と送信

2026年10月28日JST。ユーザーの「コミット・push、DB登録」及び「6セット180問をまとめて登録する（論述12問を含み、既存8問は保持）」の追答が対象。通常のローカルDBへ新172問を追加した。問題DBが実問題の正本であり、問題本文のJSONやDBバックアップはGitへ送信しない。

## 登録結果

- 6セット・24大問・180問。各セット4大問30問、選択20・語句記述8・論述2。計120選択・48語句・12論述、選択肢480。各セットで時事テーマのリードを2大問に配置した完成草案を使用。
- 既存8問と旧大問1・本文A/Bは保存し直さず、ID・内容・正答・日時・バージョン・選択肢・参照を含む全レコードの一致を確認。履歴・お気に入り・利用者を含む対象外9表の指紋も一致。
- 172件の主分類・関連分類と文化史内訳を個別に設定し、3担当が作業、別担当が相互点検。設問・全肢・各肢解説・正答・モデル・本文参照の原稿一致を独立確認。新本文の(a)等は同じ表記を保つアンカーへ変換。
- 草案の文字種の日本語表記を既存のkanji/katakanaへ対応付け、漢字とかなの混在はanyと説明欄で案内。混在文字種自体の形式検査は追加せず、許容正答の完全一致で判定する。元の字数条件を維持し、全55許容表記が条件を満たす。出典のISO日時は実際の確認日部分へ変換。

## 実行と確認範囲

1. 通常DBの非公開バックアップと全表・旧8問の読み取り記録をローカル専用領域へ保存。
2. 末尾_testの独立PostgreSQL 16 DBに旧8問を再現し、共通Writer/トランザクションで172問追加。初回は文字種、2回目は出典日付の形式で検証失敗し全追加をrollback。対応付けを修正し、事前172件検査後の3回目で成功。通常DBは成功するまで変更していない。
3. 独立DBで180問すべての公開取得と正答採点を実行、論述12モデルは各8点。再実行は追加0件で全16表の指紋不変。
4. 通常ローカルDBでも同じ処理と180問全件検証が成功。再実行は追加0件、全表・取得レコード・旧本文不変。公開HTTP一覧も6セット・各30問・各4大問。公開取得には正答・モデル・解説・出典・採点設定を含めないことを全180問で確認。
5. フロント358件中357件が通常実行で成功。接続制限で失敗したHTTPS試験を含む対象ファイル3件を接続許可後に再実行して成功。2回の実行を合わせ全358件の成功を確認し、一括358/358とは区別する。型検査・本番ビルド成功。既存の旧コピー由来の重複import警告は残る。今回の前段で実施した隔離server86件・最終essay3件の成功は、今回再実行した登録検証と区別する。

ローカル限定の詳細根拠は `local-only/mock-registration-20261028/` のnormal-first/repeat、test-first/repeat、snapshot-comparison、validation-preflight、worker-independent-review、分類点検、delivery-tests。通常DB名を完全一致で検査し、空DB専用import/seedは使っていない。

画面確認ではPC1440pxの模擬試験6・4大問一覧・見出し・本文の直列表示、SP390pxの語句/論述入力と模範解答8点、320pxの見出し/お気に入り位置/横はみ出しなしを実DB/実APIで操作した。草案11論述に残っていた未実装という時点依存の文末だけを現況の参考採点へ更新し、歴史記述・モデルは保持した。

## 送信と残る範囲

通常DBの11解説修正後も180問全件と全表不変の再検査が成功。関連ハーネス168件も成功。92ファイルの独立レビューで未解決の指摘なし。`1e2b2230c27a3e64371f6f12048fa51fad27043b`をmainへ通常pushし、同期差分0/0を確認。[CI実行](https://github.com/misato729/world-history-practice/actions/runs/40575066363)はharness/verifyとも成功。資料保護・状態検査・設定・コンテナビルド・隔離DB・API/セキュリティ・フロント/型/本番ビルドを確認した。完了記録は後続の文書コミットへまとめる。旧コピー10件は未追跡のまま保持し、原資料・分類表全文・問題草案・DB控えは送信対象外。履歴を含む私的資料保護検査と.githooks設定を確認する。

Netlifyのアクセス可能な一覧には世界史プロジェクトが存在せず、別サービスの停止表示だけを確認した。世界史の停止設定を確認済みとはせず、設定を変更しない。コミットには[skip netlify]を付ける。本番切替・デプロイは行わない。

通常演習の論述採点は参考点。1セット終了時の合計得点画面は仕様書の段階で、今回実装済みとは扱わない。

## 変更ファイル一覧

今回の送信対象（今回以前の依頼に基づく未送信差分も含む）。旧コピー10件・ローカル専用資料は含めない。

| ファイル | 内容 |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | 試験構成・作問・論述と運用の合意を反映 |
| [config/exam.json](../config/exam.json) | 模擬試験6セット・180問の案内を反映 |
| [docs/architecture.md](../docs/architecture.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/customization.md](../docs/customization.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/essay-rule-scoring-20261028.md](../docs/essay-rule-scoring-20261028.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/grouped-question-design-20261027.md](../docs/grouped-question-design-20261027.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/mock-exam-hierarchy-20261027.md](../docs/mock-exam-hierarchy-20261027.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/mock-registration-delivery-20261028.md](../docs/mock-registration-delivery-20261028.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/mock-score-display-spec-20261027.md](../docs/mock-score-display-spec-20261027.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/verification.md](../docs/verification.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/workflow/contexts/product.md](../docs/workflow/contexts/product.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md) | 階層・採点・登録の仕様又は確認結果を記録 |
| [docs/workflow/handoffs/2026-10-27T14-26-41-009Z-r72.json](../docs/workflow/handoffs/2026-10-27T14-26-41-009Z-r72.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T14-42-54-336Z-r73.json](../docs/workflow/handoffs/2026-10-27T14-42-54-336Z-r73.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T14-42-55-240Z-r74.json](../docs/workflow/handoffs/2026-10-27T14-42-55-240Z-r74.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T14-54-49-671Z-r75.json](../docs/workflow/handoffs/2026-10-27T14-54-49-671Z-r75.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-12-28-159Z-r76.json](../docs/workflow/handoffs/2026-10-27T15-12-28-159Z-r76.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-21-19-026Z-r77.json](../docs/workflow/handoffs/2026-10-27T15-21-19-026Z-r77.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-21-20-286Z-r78.json](../docs/workflow/handoffs/2026-10-27T15-21-20-286Z-r78.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-23-39-069Z-r79.json](../docs/workflow/handoffs/2026-10-27T15-23-39-069Z-r79.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-24-28-590Z-r80.json](../docs/workflow/handoffs/2026-10-27T15-24-28-590Z-r80.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-24-29-782Z-r81.json](../docs/workflow/handoffs/2026-10-27T15-24-29-782Z-r81.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-33-47-895Z-r82.json](../docs/workflow/handoffs/2026-10-27T15-33-47-895Z-r82.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-55-30-456Z-r83.json](../docs/workflow/handoffs/2026-10-27T15-55-30-456Z-r83.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-56-23-256Z-r84.json](../docs/workflow/handoffs/2026-10-27T15-56-23-256Z-r84.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T15-56-25-022Z-r85.json](../docs/workflow/handoffs/2026-10-27T15-56-25-022Z-r85.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-00-02-806Z-r86.json](../docs/workflow/handoffs/2026-10-27T16-00-02-806Z-r86.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-12-46-845Z-r87.json](../docs/workflow/handoffs/2026-10-27T16-12-46-845Z-r87.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-20-01-216Z-r88.json](../docs/workflow/handoffs/2026-10-27T16-20-01-216Z-r88.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-20-02-281Z-r89.json](../docs/workflow/handoffs/2026-10-27T16-20-02-281Z-r89.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-22-32-658Z-r90.json](../docs/workflow/handoffs/2026-10-27T16-22-32-658Z-r90.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-26-55-497Z-r91.json](../docs/workflow/handoffs/2026-10-27T16-26-55-497Z-r91.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-27-51-379Z-r92.json](../docs/workflow/handoffs/2026-10-27T16-27-51-379Z-r92.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-27-52-325Z-r93.json](../docs/workflow/handoffs/2026-10-27T16-27-52-325Z-r93.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-43-36-521Z-r94.json](../docs/workflow/handoffs/2026-10-27T16-43-36-521Z-r94.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T16-59-10-829Z-r95.json](../docs/workflow/handoffs/2026-10-27T16-59-10-829Z-r95.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-10-35-287Z-r96.json](../docs/workflow/handoffs/2026-10-27T17-10-35-287Z-r96.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-10-44-238Z-r97.json](../docs/workflow/handoffs/2026-10-27T17-10-44-238Z-r97.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-14-26-528Z-r98.json](../docs/workflow/handoffs/2026-10-27T17-14-26-528Z-r98.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-26-09-538Z-r99.json](../docs/workflow/handoffs/2026-10-27T17-26-09-538Z-r99.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-26-30-066Z-r100.json](../docs/workflow/handoffs/2026-10-27T17-26-30-066Z-r100.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-32-01-837Z-r101.json](../docs/workflow/handoffs/2026-10-27T17-32-01-837Z-r101.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-44-59-129Z-r102.json](../docs/workflow/handoffs/2026-10-27T17-44-59-129Z-r102.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-48-32-117Z-r103.json](../docs/workflow/handoffs/2026-10-27T17-48-32-117Z-r103.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-57-45-390Z-r104.json](../docs/workflow/handoffs/2026-10-27T17-57-45-390Z-r104.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-57-47-356Z-r105.json](../docs/workflow/handoffs/2026-10-27T17-57-47-356Z-r105.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T17-58-50-774Z-r106.json](../docs/workflow/handoffs/2026-10-27T17-58-50-774Z-r106.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T18-48-34-922Z-r107.json](../docs/workflow/handoffs/2026-10-27T18-48-34-922Z-r107.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T19-02-33-451Z-r108.json](../docs/workflow/handoffs/2026-10-27T19-02-33-451Z-r108.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T19-29-09-247Z-r109.json](../docs/workflow/handoffs/2026-10-27T19-29-09-247Z-r109.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T19-29-13-463Z-r110.json](../docs/workflow/handoffs/2026-10-27T19-29-13-463Z-r110.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T19-37-09-144Z-r111.json](../docs/workflow/handoffs/2026-10-27T19-37-09-144Z-r111.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T19-52-52-007Z-r112.json](../docs/workflow/handoffs/2026-10-27T19-52-52-007Z-r112.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T19-53-02-532Z-r113.json](../docs/workflow/handoffs/2026-10-27T19-53-02-532Z-r113.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T20-00-29-148Z-r114.json](../docs/workflow/handoffs/2026-10-27T20-00-29-148Z-r114.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/handoffs/2026-10-27T20-00-30-279Z-r115.json](../docs/workflow/handoffs/2026-10-27T20-00-30-279Z-r115.json) | 作業・評価時点の引き継ぎを保存 |
| [docs/workflow/state.json](../docs/workflow/state.json) | 作問・論述・登録の進捗と受入条件を記録 |
| [frontend/app/components/EssayScoringResult.vue](../frontend/app/components/EssayScoringResult.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/components/ExamSidebar.vue](../frontend/app/components/ExamSidebar.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/components/QuestionAnswerForm.vue](../frontend/app/components/QuestionAnswerForm.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/components/admin/AdminQuestionForm.vue](../frontend/app/components/admin/AdminQuestionForm.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/components/admin/AdminQuestionPreview.vue](../frontend/app/components/admin/AdminQuestionPreview.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/pages/admin/exams/[examNumber].vue](../frontend/app/pages/admin/exams/%5BexamNumber%5D.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/pages/history.vue](../frontend/app/pages/history.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/pages/index.vue](../frontend/app/pages/index.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](../frontend/app/pages/practice/%5BexamNumber%5D/%5BquestionNumber%5D.vue) | 模擬試験階層・論述入力/結果の画面を調整 |
| [frontend/app/types/adminQuestion.ts](../frontend/app/types/adminQuestion.ts) | 論述のデータ型を追加 |
| [frontend/app/utils/adminQuestionForm.ts](../frontend/app/utils/adminQuestionForm.ts) | 模擬試験の移動又は論述表示・管理編集を調整 |
| [frontend/app/utils/essayPresentation.ts](../frontend/app/utils/essayPresentation.ts) | 模擬試験の移動又は論述表示・管理編集を調整 |
| [frontend/app/utils/examCatalog.ts](../frontend/app/utils/examCatalog.ts) | 模擬試験の移動又は論述表示・管理編集を調整 |
| [frontend/app/utils/practiceSequence.ts](../frontend/app/utils/practiceSequence.ts) | 模擬試験の移動又は論述表示・管理編集を調整 |
| [frontend/server-tests/essay-learning.test.ts](../frontend/server-tests/essay-learning.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/server-tests/operations.test.ts](../frontend/server-tests/operations.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/server/data/essay-rule-profiles.ts](../frontend/server/data/essay-rule-profiles.ts) | 12論述の有限採点ルールを登録 |
| [frontend/server/database/migrations/007_essay_rule_scoring.sql](../frontend/server/database/migrations/007_essay_rule_scoring.sql) | 論述設定・採点結果の保存領域を追加 |
| [frontend/server/operations/content-v2.ts](../frontend/server/operations/content-v2.ts) | 論述設定のアーカイブ互換を追加 |
| [frontend/server/operations/content.ts](../frontend/server/operations/content.ts) | 論述設定のアーカイブ互換を追加 |
| [frontend/server/services/essay-profile.ts](../frontend/server/services/essay-profile.ts) | 論述の検証・採点・保存・正答秘匿を実装 |
| [frontend/server/services/essay-scoring.ts](../frontend/server/services/essay-scoring.ts) | 論述の検証・採点・保存・正答秘匿を実装 |
| [frontend/server/services/learning-validation.ts](../frontend/server/services/learning-validation.ts) | 論述の検証・採点・保存・正答秘匿を実装 |
| [frontend/server/services/learning-writer.ts](../frontend/server/services/learning-writer.ts) | 論述の検証・採点・保存・正答秘匿を実装 |
| [frontend/server/services/learning.ts](../frontend/server/services/learning.ts) | 論述の検証・採点・保存・正答秘匿を実装 |
| [frontend/shared/types/essay.ts](../frontend/shared/types/essay.ts) | 論述のデータ型を追加 |
| [frontend/shared/types/learning.ts](../frontend/shared/types/learning.ts) | 論述のデータ型を追加 |
| [frontend/tests/catalogExamNavigation.test.ts](../frontend/tests/catalogExamNavigation.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/tests/essayPresentation.test.ts](../frontend/tests/essayPresentation.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/tests/essayProfiles.test.ts](../frontend/tests/essayProfiles.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/tests/essayScoring.test.ts](../frontend/tests/essayScoring.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/tests/examSidebarLayout.test.ts](../frontend/tests/examSidebarLayout.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/tests/fixtures/essayRuleCases.ts](../frontend/tests/fixtures/essayRuleCases.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [frontend/tests/groupedLearningPresentation.test.ts](../frontend/tests/groupedLearningPresentation.test.ts) | 階層表示・論述採点・互換性の関連検査又は合成答案 |
| [docs/workflow/handoffs/2026-10-27T20-03-56-324Z-r116.json](../docs/workflow/handoffs/2026-10-27T20-03-56-324Z-r116.json) | 通常DB登録と検証の区切りを保存 |
| [docs/workflow/handoffs/2026-10-27T20-09-19-375Z-r117.json](../docs/workflow/handoffs/2026-10-27T20-09-19-375Z-r117.json) | 登録・送信の最終評価と完了を記録 |
| [docs/workflow/handoffs/2026-10-27T20-09-33-148Z-r118.json](../docs/workflow/handoffs/2026-10-27T20-09-33-148Z-r118.json) | 登録・送信の最終評価と完了を記録 |
