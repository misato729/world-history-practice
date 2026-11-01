# 模擬試験結果保存の本番反映（2026-11-01）

ユーザーのDB更新・commit・push・deployの明示依頼による。本番の既存Netlify/Fly.io/Neonへ反映し、Netlify自動ビルド停止は維持する。

## DB

Neonへ共通migrationから008_practice_attempts.sqlのみ適用。既存15表の件数・内容ダイジェストが同一であることをトランザクション内で確認。問題210件を含む既存データに変更なし。秘密を含まない詳細結果はローカル専用のlocal-only/mock-results-release-20261101/database-update.json。

## 配信

機能コミット `abd3156590941b0176deb7364a0cf1853628503c` をmainへpush。実装前段のAPI新3・既存回帰38、フロント470、型検査、独立ブラウザーPC/SPの根拠は[実装記録](mock-results-20261101.md)を参照。

- Netlify: 既存site `770ebe7e-9cdd-4afe-b664-b5cb2e2994ad`、deploy `6ae6a59e781a5dc8f972299f` がready。本番URLは https://world-history-practice.netlify.app 。公開前後とも `build_settings.stop_builds=true`。静的画面106ファイルのみを手動配信し、DB認証情報・APIサーバー・ローカル資料は送信していない。
- 画面は元のNetlifyビルドと同じSSR無効・空serverDir・Fly API接続で生成。SPA直接アクセス用 `_redirects` を配信成果物へ追加。
- Fly.io: 既存app `world-history-practice`、release v9 complete、NRT2台のimageは `abd3156`。release_commandも成功。health200。新規の恒常マシン追加・リージョン変更なし。
- Dockerfile参照はFly CLIが設定ファイル位置を起点に解釈し、`--config frontend/fly.toml` ではfrontend/frontendとなってビルド前に停止した。元設定と同一の一時コピーをリポジトリ直下へ置き、`fly deploy . --config fly-release-20261101.toml --remote-only --image-label abd3156` で成功。一時コピーは削除しGit対象外。実際のDocker build contextは191.69kBで、既存.dockerignoreによる原資料・秘密保護を維持。

## CIの修正

最初のCI `41265851016` はharness成功・verify失敗。既存operationsテストが007を適用する際に全migrationを呼んで008も適用され、旧期待値と不一致になったため。007専用の保存・冪等性テストを `migrateThrough(...007)` に限定し、008の統合検査は維持した。隔離した新規ローカル_test DBでoperations21件成功・skip0、作成DBを削除済み。テスト修正は `c4a7730abb478b6fea0417136688d88cf0413f17` としてmainへpush。アプリ実行コードは公開済みabd3156と同一。修正後CI `41266125661` はharness・verifyとも成功。

## 本番確認

既存管理者で模試1の1問だけを回答・終了。結果1件とその回答履歴1件を確認用として保持し、会員作成・削除、既存問題の編集、他の履歴削除は行っていない。再ログイン後の本人GETが終了時と完全一致。PC1440/SP390の結果ページ表示・再読込・横はみ出しを確認し、画像と詳細結果は `local-only/mock-results-release-20261101/` のみに保存する。PC画像は実際の表示幅260px・見出しの前面表示を確認して取得済み。全ページ撮影による一時的な再配置を避け、PCはviewport画像として保存。動作確認後も教材5表の件数・内容ダイジェストが更新前と同一。

## 変更範囲

このリリースで追加・変更するのは本書、`docs/workflow/state.json`、`docs/workflow/contexts/service.md`、追加の引き継ぎ記録、`frontend/server-tests/operations.test.ts`。実装の未コミット分は開始前からの作業であり、今回の実装変更には数えず、承認対象としてまとめて送信した。削除ファイルなし。

開始時の機能・検証・記録ファイル:

- `config/exam.json`
- `docs/mock-score-display-spec-20261027.md`
- `docs/workflow/contexts/service.md`
- `docs/workflow/state.json`
- `frontend/app/pages/practice/[examNumber]/[questionNumber].vue`
- `frontend/server/api/v1/[...path].ts`
- `frontend/server/services/learning.ts`
- `frontend/shared/examConfig.ts`
- `docs/mock-results-20261101.md`
- `docs/screenshots/mock-results-desktop.png`
- `docs/screenshots/mock-results-mobile-320.png`
- `docs/screenshots/mock-results-mobile.png`
- `docs/workflow/handoffs/2026-11-01T01-54-37-608Z-r203.json`
- `docs/workflow/handoffs/2026-11-01T02-19-21-176Z-r204.json`
- `docs/workflow/handoffs/2026-11-01T02-19-26-772Z-r205.json`
- `frontend/app/components/PracticeAttemptResults.vue`
- `frontend/app/composables/usePracticeAttempt.ts`
- `frontend/app/pages/practice/results/[attemptId].vue`
- `frontend/server-tests/practice-attempts.test.ts`
- `frontend/server/database/migrations/008_practice_attempts.sql`
- `frontend/server/services/practice-attempts.ts`
- `frontend/shared/practiceResults.ts`
- `frontend/shared/types/practiceAttempt.ts`
- `frontend/tests/practiceResults.test.ts`

## 最終レビュー

mock_results_reviewがDB保持・同一配信先・停止維持・本番結果保存/PC/SP画像・修正CI成功を読取確認し、阻害事項なしとして合格。初回CI不合格は引き継ぎr207へ保持する。
