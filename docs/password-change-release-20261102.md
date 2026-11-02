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

機能コミット `7dce98b350f191dd02b3ae8ad710afea5d8f2cb2` をmainへ通常pushし、pre-pushの全履歴保護検査が成功。送信直後origin/mainとの差分0/0を確認した。

- Fly.io：release **v10 complete**。既存NRTの2台とも `registry.fly.io/world-history-practice:7dce98b` へ更新。release_commandの共通db:migrate成功。Docker contextは133.43kBで、原資料・秘密・local-onlyを送信していない。設定は既存frontend/fly.tomlと同一の一時コピーをルートへ置いて実行し、完了後削除した。恒常マシン追加・リージョン・自動停止設定の変更なし。
- Netlify：既存site `770ebe7e-9cdd-4afe-b664-b5cb2e2994ad` の自動配信。deploy `6ae7f0a29370fb3d8a800300` は **ready**、対象SHAは7dce98b、公開日時2026-11-02T02:08:59.591Z。本番は [世界史ラボ](https://world-history-practice.netlify.app)。自動配信は有効のまま。
- [GitHub Actions 41376102214](https://github.com/misato729/world-history-practice/actions/runs/41376102214)：harness・verifyとも **success**。隔離DBのAPI/セキュリティ、フロント全件・型検査・build、本番非rootイメージ検査まで成功。
- 本番の合成会員を1名作成し、APIで未認証401・現在パスワード誤り422・確認不一致422・変更200、新セッション有効・旧トークン401・旧パスワード401・新パスワード再ログイン200を確認。会員の公開プロフィールは同一。既存の実利用者のパスワードは変更していない。
- 合成会員は本人の現在パスワードによるDELETE APIで削除し、旧トークン/再ログインとも401を確認。秘密の一時ファイルも削除した。最終照合は既存16表のうち操作に伴う回数制限データだけが変化し、他15表の件数/内容ダイジェストは更新前と一致。問題210・既存会員2を保持。
- Chromeの既存ログイン状態で本番アカウント設定を閲覧。新フォーム・3つの必須password欄・新パスワード8文字以上・自動入力属性、再読込、PC1440/SP390/SP320で横はみ出しなしを確認。ブラウザで実際のパスワード入力/変更は行わず、保存の検証は上記合成会員の実APIと区別する。既存会員のログイン状態を変更せず、検証タブを閉じ、viewportを復元。
- トップページ1024pxでも見出し/図の重なり・横はみ出しなし。API正常/教材一覧の読込完了も確認。
- 本番画像はlocal-onlyへ保存。フォームを含むviewport画像には個人のメールアドレスが出ない位置を使用。ブラウザのclip撮影では意図した領域と一致しなかったため破棄し、通常のviewport撮影で確認した。

反映完了の文書だけを追送し、重複するNetlifyビルドは `[skip netlify]` で省略する。機能イメージ/公開画面のSHAは7dce98bのまま。

## このリリースで追加・変更したファイル

機能作業からの承認済みファイルは[機能のファイル一覧](password-change-20261102.md#ファイル一覧)を参照。

- [frontend/app/pages/index.vue](../frontend/app/pages/index.vue)：既存CI失敗の原因である見出し文字サイズを最小修正。
- [本記録](password-change-release-20261102.md)：DB保全・配信・検証結果。
- [service.md](workflow/contexts/service.md)、[state.json](workflow/state.json)：依頼・受入条件・進捗と追加の不変引き継ぎ記録。
- ローカル専用：`local-only/password-change-20261102/release-db.ts`（共通migration呼出し・保全検査）、`release-database.json`（件数/ダイジェストのみ）、配信前後の状態・実行ログ・画面確認画像。これらはGit/Docker送信対象外。

## 独立最終レビュー

password_change_reviewが指定のDB/配信/保全/本番API/UI記録と2画像を読取確認し、15表一致と回数制限だけの差分を独自に再計算した。GitHubからCIも独立取得し、全工程成功を確認。追加の要修正なしとして合格。

完了記録の追送SHA・同期・CIは、送信後にローカル専用の `release-final-receipt.json` へ保存する。機能の配信SHAと区別し、文書追送でAPI/画面/DBを再変更しない。

## ローカル専用のリリース補助ファイル

- [fly-release-before.json](../local-only/password-change-20261102/fly-release-before.json)：Flyの更新前状態。
- [netlify-release-before-private.json](../local-only/password-change-20261102/netlify-release-before-private.json)：Netlifyの更新前設定（非公開情報を含むためローカル専用）。
- [netlify-release-deploys.json](../local-only/password-change-20261102/netlify-release-deploys.json)：自動配信開始時の状態。
- [netlify-release-current.json](../local-only/password-change-20261102/netlify-release-current.json)：Netlify readyと対象SHA。
- [release-unit.log](../local-only/password-change-20261102/release-unit.log)：全472件の成功ログ。
- [release-db.ts](../local-only/password-change-20261102/release-db.ts)：共通migrationと既存データ保持の検証。
- [release-database.json](../local-only/password-change-20261102/release-database.json)：ROLLBACK・適用・再実行と16表のダイジェスト。
- [release-context.log](../local-only/password-change-20261102/release-context.log)：送信前workflow検査。
- [fly-release.log](../local-only/password-change-20261102/fly-release.log)：APIのbuild・release・2台更新ログ。
- [fly-release-after.json](../local-only/password-change-20261102/fly-release-after.json)：更新後の既存2台とhealth。
- [fly-release-versions.json](../local-only/password-change-20261102/fly-release-versions.json)：release v10 complete。
- [production-password-check.mjs](../local-only/password-change-20261102/production-password-check.mjs)：合成会員だけで行う本番機能検証と削除。
- [production-password-check.json](../local-only/password-change-20261102/production-password-check.json)：変更/失効/再ログイン/削除成功。
- [release-preservation.ts](../local-only/password-change-20261102/release-preservation.ts)：操作終了後の全表ダイジェスト照合。
- [release-data-preservation.json](../local-only/password-change-20261102/release-data-preservation.json)：最終15表不変と回数制限データの差分。
- [release-browser.json](../local-only/password-change-20261102/release-browser.json)：本番の画面確認範囲。
- [production-password-form.png](../local-only/password-change-20261102/production-password-form.png)：本番フォームのviewport画像。
- [production-home1024.png](../local-only/password-change-20261102/production-home1024.png)：1024pxトップの表示画像。
- [release-ci.json](../local-only/password-change-20261102/release-ci.json)：機能コミットのCI成功。
- [release-final-receipt.json](../local-only/password-change-20261102/release-final-receipt.json)：文書追送後の同期・CI確認。

一時的なルート設定ファイル `fly-password-release-20261102.toml` と、合成会員だけの一時認証ファイルは今回作成し、使用後に削除した。既存の認証ファイルやバックアップは保持。

今回の引き継ぎ記録：

- [r215](workflow/handoffs/2026-11-02T02-05-30-167Z-r215.json)：送信準備。
- [r216](workflow/handoffs/2026-11-02T02-15-35-638Z-r216.json)：独立レビュー後の合格評価。
- [r217](workflow/handoffs/2026-11-02T02-15-38-653Z-r217.json)：本番反映の完了。
- [release-context-final.log](../local-only/password-change-20261102/release-context-final.log)：最終workflow検査（送信対象外）。
