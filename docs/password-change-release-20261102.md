# パスワード変更の本番反映（2026-11-02）

ユーザーの「コミット・push・デプロイして本番反映」の明示依頼により、[機能実装](password-change-20261102.md)を既存Netlify/Fly.io/Neonへ反映する。既存利用者のパスワードは変更しない。Netlify Personal加入後の自動配信許可を維持する。

## 送信準備

開始HEADは `1c6d91d361d7c1d87fe2578e5f8fb57ff563e473`、origin/mainとの開始差分0/0。未コミットの対象は承認済みのパスワード機能と関連記録のみ。

既存HEADのCI `41353945772` はトップページの `clamp(2rem, 3vw, 3rem)` が既存の文字サイズ検査に違反して失敗していた。配信前検査を通すため、`frontend/app/pages/index.vue` の見出しだけを3rem、960px以下を2remへ変更。既存640px以下の2remも保持。PC1440/SPの指定サイズは従来と同じで、中間幅の表示は配信後に確認する。

- フロント472件成功、失敗・スキップ0（ローカル待受を必要とする依存検査も含む）。
- 設定・合成教材検査、全Git履歴の原資料保護検査、差分検査に成功。core.hooksPath=.githooks。
- 機能のAPI12/認証15、型検査/build、PC/SP、独立レビューの既存根拠は機能実装記録を参照。今回重い検査は順に実行し、CIと両配信の結果をこの後追記する。
- 独立準備レビューpassword_change_reviewに阻害事項なし。Fly全2台の新イメージ確認後に失効を検査し、1024px付近のトップ見出しも確認する。

## DB更新

本番の既存Neon DBへ直接接続し、共通migrateのトランザクションで009だけを追加する。初めに同じ操作をROLLBACKし、その後本適用する。全既存表をロックして件数・内容ダイジェストを比較（usersは追加列auth_versionのみを比較から除外）。既存利用者の認証版は全て0、共通migrate再実行の適用0件も確認する。詳細結果はローカル専用 `local-only/password-change-20261102/release-database.json` に保存し、秘密・利用者情報・問題本文は送信しない。

009だけを本適用済み。ROLLBACK検証成功、既存16表の内容・件数不変、既存会員の認証版0、再実行適用0件を確認した。問題210件を保持。

## 配信・本番確認

現在は送信準備中。完了後に実際のGit SHA、Netlify/Fly配信、CI、本番検証と合成会員の後片付けを記録する。既存の実利用者アカウントでは変更操作をしない。

## このリリースで追加・変更したファイル

機能作業からの承認済みファイルは[機能のファイル一覧](password-change-20261102.md#ファイル一覧)を参照。

- [frontend/app/pages/index.vue](../frontend/app/pages/index.vue)：既存CI失敗の原因である見出し文字サイズを最小修正。
- [本記録](password-change-release-20261102.md)：DB保全・配信・検証結果。
- [service.md](workflow/contexts/service.md)、[state.json](workflow/state.json)：依頼・受入条件・進捗と追加の不変引き継ぎ記録。
- ローカル専用：`local-only/password-change-20261102/release-db.ts`（共通migration呼出し・保全検査）、`release-database.json`（件数/ダイジェストのみ）、配信前後の状態・実行ログ・画面確認画像。これらはGit/Docker送信対象外。
