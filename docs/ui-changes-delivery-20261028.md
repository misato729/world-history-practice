# 体裁・演習条件・補足表示の変更の送信（2026-10-28）

ユーザーの「OKです。コミット・pushしてください」により、前回の送信以降に完了した以下の実装・仕様・検証記録をmainへ通常送信する。DB登録・更新は各タスクで既に行った通常ローカル環境の作業であり、今回のGit送信でDBや原稿をコピーしない。

- 本文の実体下線・参照の検査と「【A】」等の表記、収録内容を5セットへ整理した設定・作問要件。[体裁の変更と検証範囲](mock-format-revision-20261028.md)。
- 本文ごとの小問をまとめ、下線順に配置する方針と順次取得の改善。[小問順の変更と検証範囲](question-order-update-20261028.md)。
- 条件指定の正確な件数表示、文化史の複数チェックボックスとOR検索、非同期取得・条件の保持。[条件指定の変更と検証範囲](practice-filter-count-20261028.md)。
- 語句記述の`short-answer-hint`を共通回答フォームから削除。採点・入力制約・正規化・論述の補足は維持。[ローカル検証](../local-only/short-answer-hint-20261028/verification.json)。

## 送信前の確認

送信先は既存の`origin/main`。取得時点でローカルとリモートの差分は0/0。旧コピー10件は未追跡のまま保持し、ローカル専用の過去問・用語集・分析・分類全文・DB・バックアップ・問題原稿も送信しない。明示した正規ファイルだけをstageし、NUL区切りの一覧とSHAを別担当が確認する。

今回、資料保護・進捗の軽量検査168件、設定と合成教材検査、全Git参照の資料保護検査が成功した。フロント368件のうち367件が成功し、ローカルHTTPS待受の1件は実行環境の接続制限で失敗した。ソースを変更せず接続可能な環境で該当の依存互換3件を再実行し、全件成功した。失敗ログと評価は保持する。直前の実装時にはサーバー87件・型検査・ビルド、PC/SPの実操作も確認しており、今回の送信のために通常DBへ書込は行わない。

送信前の独立レビューで、設定手順に旧1大問8問時点の説明が残っていたため、現在の5セット150問へ合わせた。コードや問題データの追加変更は行っていない。

Netlifyのアクセス可能なチーム一覧を今回読み取り、登録は別サービスの`johokyonin-lab`だけで「Builds are stopped」と表示されていた。世界史ラボの停止設定を確認済みとはしない。設定変更・登録・ビルド再開・デプロイは行わず、コミットには`[skip netlify]`を付ける。

送信対象の各ファイルと用途・SHA、実際のpush・同期・CIの結果は、この文書と[ローカル送信記録](../local-only/ui-changes-delivery-20261028/)へ記録する。送信準備の完了をpush成功や本番確認とは扱わない。

## 送信結果

実装・仕様・記録の正規44件を[`d6a8fa4`](https://github.com/misato729/world-history-practice/commit/d6a8fa45c3709d122460908e34884c3564df2bcb)としてmainへ通常pushした。pre-pushの資料全履歴検査が成功し、実リモートmainのSHA一致・差分0/0、全44ファイルのstage時SHA一致、旧コピー10件の保持を確認した。

[GitHub Actions 40701704734](https://github.com/misato729/world-history-practice/actions/runs/40701704734)は対象SHAでharness・verifyとも成功。資料保護、進捗/設定、隔離DBのAPI・セキュリティ、フロント、型検査、ビルド、後片付けまで成功した。今回も通常DBの書込や本番反映は行っていない。完了を記録した文書・進捗は別のskip付きコミットで送信し、その最終同期結果をローカル送信記録へ残す。

## 送信対象ファイル

以下の44件を実装コミットに含めた。完了記録のコミットでは本書・serviceカード・stateを更新し、末尾の完了引き継ぎ2件も追加する。既存の旧コピー10件は対象外。

| ファイル | 変更内容 |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | 本文・下線・小問順と条件指定の共通ルール |
| [config/exam.json](../config/exam.json) | 収録数を5セット150問へ整理 |
| [docs/architecture.md](../docs/architecture.md) | 複数文化史と条件件数のAPI仕様 |
| [docs/customization.md](../docs/customization.md) | 条件指定の仕様と現在の収録構成 |
| [docs/mock-exam-authoring-requirements-20261028.md](../docs/mock-exam-authoring-requirements-20261028.md) | 本文をまとめ下線順にする作問要件 |
| [docs/mock-format-revision-20261028.md](../docs/mock-format-revision-20261028.md) | 本文・下線改稿と第6セット削除の検証記録 |
| [docs/practice-filter-count-20261028.md](../docs/practice-filter-count-20261028.md) | 件数・文化史チェックと検証範囲 |
| [docs/question-order-update-20261028.md](../docs/question-order-update-20261028.md) | 小問の順序変更とID等の保持記録 |
| [docs/ui-changes-delivery-20261028.md](../docs/ui-changes-delivery-20261028.md) | 送信範囲と実際のpush・CI結果 |
| [docs/workflow/contexts/product.md](../docs/workflow/contexts/product.md) | 教材側の方針と現在地 |
| [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md) | 実装・検証・送信の現在地 |
| [docs/workflow/handoffs/2026-10-28T07-03-25-548Z-r124.json](../docs/workflow/handoffs/2026-10-28T07-03-25-548Z-r124.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T07-22-22-269Z-r125.json](../docs/workflow/handoffs/2026-10-28T07-22-22-269Z-r125.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T08-01-36-037Z-r126.json](../docs/workflow/handoffs/2026-10-28T08-01-36-037Z-r126.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T08-04-53-701Z-r127.json](../docs/workflow/handoffs/2026-10-28T08-04-53-701Z-r127.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T10-24-54-319Z-r128.json](../docs/workflow/handoffs/2026-10-28T10-24-54-319Z-r128.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T10-39-39-955Z-r129.json](../docs/workflow/handoffs/2026-10-28T10-39-39-955Z-r129.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T10-58-04-204Z-r130.json](../docs/workflow/handoffs/2026-10-28T10-58-04-204Z-r130.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T10-58-06-692Z-r131.json](../docs/workflow/handoffs/2026-10-28T10-58-06-692Z-r131.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T12-09-33-271Z-r132.json](../docs/workflow/handoffs/2026-10-28T12-09-33-271Z-r132.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T12-38-48-698Z-r133.json](../docs/workflow/handoffs/2026-10-28T12-38-48-698Z-r133.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T12-39-01-408Z-r134.json](../docs/workflow/handoffs/2026-10-28T12-39-01-408Z-r134.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T13-41-25-228Z-r135.json](../docs/workflow/handoffs/2026-10-28T13-41-25-228Z-r135.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T13-44-41-853Z-r136.json](../docs/workflow/handoffs/2026-10-28T13-44-41-853Z-r136.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T13-44-43-854Z-r137.json](../docs/workflow/handoffs/2026-10-28T13-44-43-854Z-r137.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T13-50-15-838Z-r138.json](../docs/workflow/handoffs/2026-10-28T13-50-15-838Z-r138.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T13-52-43-931Z-r139.json](../docs/workflow/handoffs/2026-10-28T13-52-43-931Z-r139.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/state.json](../docs/workflow/state.json) | 各タスクの受入条件・評価・完了状態 |
| [frontend/app/components/QuestionAnswerForm.vue](../frontend/app/components/QuestionAnswerForm.vue) | 語句記述の補足ヒントを削除 |
| [frontend/app/components/SharedPassagePanel.vue](../frontend/app/components/SharedPassagePanel.vue) | 共通本文見出しを【A】等へ統一 |
| [frontend/app/components/admin/AdminQuestionForm.vue](../frontend/app/components/admin/AdminQuestionForm.vue) | 管理画面の本文表記を統一 |
| [frontend/app/components/admin/AdminQuestionPreview.vue](../frontend/app/components/admin/AdminQuestionPreview.vue) | 管理プレビューの本文表記を統一 |
| [frontend/app/composables/usePracticeFilterCatalog.ts](../frontend/app/composables/usePracticeFilterCatalog.ts) | 条件・認証に追従する件数取得 |
| [frontend/app/pages/admin/exams/[examNumber].vue](../frontend/app/pages/admin/exams/[examNumber].vue) | 管理一覧の本文表記を統一 |
| [frontend/app/pages/index.vue](../frontend/app/pages/index.vue) | 条件に合う件数と複数チェック・開始処理 |
| [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](../frontend/app/pages/practice/[examNumber]/[questionNumber].vue) | 本文指定と複数文化史条件の表示 |
| [frontend/app/utils/historyTopics.ts](../frontend/app/utils/historyTopics.ts) | 複数文化史の正規化とラベル |
| [frontend/app/utils/practiceFilterCatalog.ts](../frontend/app/utils/practiceFilterCatalog.ts) | 古い応答・失敗・未確定の取り扱い |
| [frontend/server-tests/grouped-learning.test.ts](../frontend/server-tests/grouped-learning.test.ts) | 実体下線と公開順カーソルの検査 |
| [frontend/server-tests/learning.test.ts](../frontend/server-tests/learning.test.ts) | 複数区分・章節AND・公開権限の検査 |
| [frontend/server/services/learning-validation.ts](../frontend/server/services/learning-validation.ts) | 公開時に空・無効の下線を拒否 |
| [frontend/server/services/learning.ts](../frontend/server/services/learning.ts) | 順次取得の表示順と文化史OR検索 |
| [frontend/tests/passageUnderline.test.ts](../frontend/tests/passageUnderline.test.ts) | 下線表現の検査 |
| [frontend/tests/practiceFilterCatalog.test.ts](../frontend/tests/practiceFilterCatalog.test.ts) | 条件・遅延応答・認証変更の検査 |
| [docs/workflow/handoffs/2026-10-28T14-04-08-041Z-r140.json](../docs/workflow/handoffs/2026-10-28T14-04-08-041Z-r140.json) | 各作業・評価・完了時の引き継ぎ |
| [docs/workflow/handoffs/2026-10-28T14-04-10-648Z-r141.json](../docs/workflow/handoffs/2026-10-28T14-04-10-648Z-r141.json) | 各作業・評価・完了時の引き継ぎ |
