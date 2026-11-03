# 更新履歴と管理画面（2026-11-04）

トップの「利用にあたって」の下に日付/内容を表示し、日付降順・同日は登録順降順とする。公開取得は認証不要、管理一覧/追加/編集/削除はサーバー側で管理者限定。内容はプレーンテキストで改行を保持しHTMLを実行しない。日付を実在日で検証し、内容1〜2000文字・版番号のDB範囲を検査。版条件付き更新/削除で競合を409として拒否し、再取得後に対象の編集を選び直す案内を出す。取得失敗を空一覧と表示しない。

追加011マイグレーションに2026/11/1「本サービスをリリースしました」、11/2・11/3「機能改善・機能追加を行いました」を初期登録。適用済みSQLや問題seedは変更しない。再マイグレーションで重複/削除済み履歴の復活が起きないことを隔離DBで検証。両ラボの隔離DB HTTP検査が成功し、権限・無効入力・保存/再取得/変更/競合/削除/反復を確認。型検査成功。UIと独立最終レビューは確認中。

世界史の既存ローカルDBには共通CLIで011だけを適用し、初期3件を登録した。日本史の通常ローカルサービスは未起動のため、通常DB適用は未実施（専用隔離DBでは3件と管理機能を確認）。本番変更・Git送信は未依頼。既存Stripe/マイページ関連の未コミット差分を保持する。

## 最終確認

両ラボの合成Nuxt＋実隔離DBで、管理画面の追加→編集→再読み込み→確認付き削除を実操作し、指定3件に戻ることを確認。PC1280/SP390でページ幅一致、トップの見出し順が「問題演習を始める→利用にあたって→更新履歴」、初期3件の日付降順を確認。暗い管理テーマ上の新パネル・入力・補助文字色も調整。検証用の非対象資格APIが未定義のため、一時画面のサイドバーには資格取得エラーが出るが、製品の認証/APIコードは変更していない。独立最終レビューPASS。初回UIの見出し色を修正して再確認済み。

既存世界史の記録用ロックは保持し、正規CLIの完了記録だけを分離worktreeから作成して戻す。日本史は元作業場所で記録する。送信・本番反映なし。

## 今回の変更ファイル（既存作業は除外）

- `frontend/app/pages/index.vue`
- `frontend/app/layouts/admin.vue`
- `frontend/app/components/UpdatesHistory.vue`
- `frontend/app/pages/admin/updates.vue`
- `frontend/shared/types/updates.ts`
- `frontend/server/services/updates.ts`
- `frontend/server/api/v1/[...path].ts`
- `frontend/server/database/migrations/011_service_updates.sql`
- `frontend/server-tests/updates.test.ts`
- `docs/updates-history-20261104.md`
- `docs/workflow/state.json`
- `docs/workflow/contexts/service.md`
- `docs/workflow/handoffs/2026-11-03T21-18-41-121Z-r319.json`
- `docs/workflow/handoffs/2026-11-03T21-18-42-036Z-r320.json`
