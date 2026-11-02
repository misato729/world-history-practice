# GASパスワード再設定の本番反映（2026-11-02）

ユーザーがGAS公開・Fly設定後に「本番反映まで進める」と明示承認した範囲で、commit/push、既存Fly/Netlify、SQL010を反映する。既存会員のパスワードを変更しない。実配送と本人の再設定は、設定/公開の検査と分けて扱う。

## 反映前

- 開始HEAD d1438f8、origin/mainとのdivergence 0/0。既存未コミット差分は今回までのGAS関連実装・試作履歴のみ。
- Fly v11 completeだが全2台は旧image7dce98b。GAS設定名は登録済み。値を表示せず、有効化true・URL形式・共有鍵64hex・frontend origin一致を確認。
- DBは009まで17表、210問/560肢/2利用者。回数制限を除く16表の件数・匿名内容指紋をDB内集計で取得。自動停止でSSHできない場合は通常のhealth GETで既存VMを起動し集計した。本文/秘密/個人情報の生値は取得していない。
- Netlify最新readyは7dce98b。forgot/reset画面はいずれも404。Netlifyの/api/v1は配信経路ではなく、既存の別origin API構成を使う。
- hooksPath=.githooks、全履歴原資料保護・対象34ファイル照合・cached diff・template検査成功。独立準備レビューPASS。staged検査で自作fragmentテスト末尾の空行だけを除去した。実装の再変更なし。前段のserver102/front481・型/buildの根拠は[実装記録](gas-password-reset-20261102.md)を参照。

## 送信・配信

機能コミット f89327a。まずFly全台へ新APIと010を反映し、その後pushによりNetlifyを公開する。元frontend/fly.tomlとバイト一致の自作ルート一時設定を使い、配信後に自分の一時ファイルだけを除去する。

- Flyのrelease_commandで010を適用し正常終了。既存NRT2台とも `registry.fly.io/world-history-practice:f89327a` へ更新。一方は自動停止、起動側health passing。自分の一時設定を内容一致確認後に削除。常設VM追加や配信設定変更はなし。
- DBの新規追加は空のpassword_reset_tokens表とmigration010の1行。回数制限・移行履歴を除く既存15表は件数/内容指紋一致。210問/560肢/2利用者、3履歴/1お気に入り/2演習試行を保持。
- 設定モジュールの検証と010のSHA256一致、GASへのGET→Google ContentServiceの所定host→期待JSONを確認。GASの秘密鍵値やURLそのものは表示しない。これはメール配送・署名共有鍵一致の実証とは別。
- mainへ通常push、pre-pushの全履歴保護成功、remoteとの差分0/0。
- Netlify deploy **6ae832e28aded88f3f06f3d2 ready**、対象SHA **f89327ae9ca7e9d3003baf9397b79261d2b60f98**、公開2026-11-02T06:51:38.969Z。自動配信設定は維持。
- [GitHub Actions 41402545321](https://github.com/misato729/world-history-practice/actions/runs/41402545321)のharness/verify全工程success。API/DB、front/型/build、非root本番image検査まで完了。

## 公開先の確認

- Fly health200、Netlify login/forgot/reset200。forgot/resetはnoindex・no-referrer、resetはCache-Control:no-store。
- 実ChromeでPC1440/SP390/320、login→forgot、存在しない検証用.invalidメールへの申請と汎用受付、API正常表示を確認。この申請は実メールを送っていない。
- 合成token形式のフラグメントから再設定フォームを表示し、アドレス欄から消えること、横はみ出しなし、再読込では無効リンク案内になることを確認。パスワード入力や送信は行わない。
- 本番APIで存在しないランダムtokenの保存要求が422 invalid_reset_token、no-store、正しいCORSで拒否されることを確認。既存利用者は変更しない。
- ユーザーが本番の登録メールで申請し、「メールが届き、再設定できた」と回答。実配送と本人による再設定の成功を利用者確認として記録する。パスワードや再設定リンクは取得していない。DB保全比較はこの本人操作前の結果で、本人のパスワード変更によるusers更新と区別する。
- 独立担当 `email_reset_review` がGitHubから全工程successを別途取得し、DB既存15表の指紋一致を再計算。Fly2台/Netlify/010/GAS GET/公開ヘッダー/無効token拒否、2画像、対象34ファイル・全履歴保護・remote同期・一時設定不在を確認してPASS。秘密値や再設定リンクをレビュー担当へ渡していない。

機能は同じSHAで配信済み。完了報告の文書追送は `[skip netlify]` として重複ビルドを避け、機能の公開SHAと区別する。

## 機能コミットの対象ファイル

各ファイルの具体的な内容は[実装記録の変更一覧](gas-password-reset-20261102.md#今回の変更ファイル)を参照。公開対象は以下の34ファイルだけ。

- [.env.example](../.env.example)
- [README.md](../README.md)
- [docs/architecture.md](architecture.md)
- [docs/workflow/contexts/service.md](workflow/contexts/service.md)
- [docs/workflow/state.json](workflow/state.json)
- [docs/email-password-reset-20261102.md](email-password-reset-20261102.md)
- [docs/manual-password-reset-20261102.md](manual-password-reset-20261102.md)
- [docs/gas-password-reset-20261102.md](gas-password-reset-20261102.md)
- [docs/gas-password-reset-setup.md](gas-password-reset-setup.md)
- [frontend/app/pages/login.vue](../frontend/app/pages/login.vue)
- [frontend/app/pages/forgot-password.vue](../frontend/app/pages/forgot-password.vue)
- [frontend/app/pages/reset-password.vue](../frontend/app/pages/reset-password.vue)
- [frontend/app/utils/passwordReset.ts](../frontend/app/utils/passwordReset.ts)
- [frontend/nuxt.config.ts](../frontend/nuxt.config.ts)
- [frontend/server/api/v1/[...path].ts](../frontend/server/api/v1/%5B...path%5D.ts)
- [frontend/server/core/rate-limit.ts](../frontend/server/core/rate-limit.ts)
- [frontend/server/services/accounts.ts](../frontend/server/services/accounts.ts)
- [frontend/server/services/password-validation.ts](../frontend/server/services/password-validation.ts)
- [frontend/server/services/password-reset.ts](../frontend/server/services/password-reset.ts)
- [frontend/server/services/password-reset-mail.ts](../frontend/server/services/password-reset-mail.ts)
- [frontend/server/database/migrations/010_password_reset_tokens.sql](../frontend/server/database/migrations/010_password_reset_tokens.sql)
- [frontend/server-tests/password-reset.test.ts](../frontend/server-tests/password-reset.test.ts)
- [frontend/tests/passwordReset.test.ts](../frontend/tests/passwordReset.test.ts)
- [frontend/tests/passwordResetMail.test.ts](../frontend/tests/passwordResetMail.test.ts)
- [frontend/tests/passwordResetGas.test.ts](../frontend/tests/passwordResetGas.test.ts)
- [frontend/automation/password-reset/Code.gs](../frontend/automation/password-reset/Code.gs)
- [frontend/automation/password-reset/appsscript.json](../frontend/automation/password-reset/appsscript.json)
- [docs/workflow/handoffs/2026-11-02T02-49-22-314Z-r221.json](workflow/handoffs/2026-11-02T02-49-22-314Z-r221.json)
- [docs/workflow/handoffs/2026-11-02T02-57-46-238Z-r222.json](workflow/handoffs/2026-11-02T02-57-46-238Z-r222.json)
- [docs/workflow/handoffs/2026-11-02T02-57-50-206Z-r223.json](workflow/handoffs/2026-11-02T02-57-50-206Z-r223.json)
- [docs/workflow/handoffs/2026-11-02T03-48-55-317Z-r224.json](workflow/handoffs/2026-11-02T03-48-55-317Z-r224.json)
- [docs/workflow/handoffs/2026-11-02T03-49-09-738Z-r225.json](workflow/handoffs/2026-11-02T03-49-09-738Z-r225.json)
- [docs/workflow/handoffs/2026-11-02T04-08-37-828Z-r226.json](workflow/handoffs/2026-11-02T04-08-37-828Z-r226.json)
- [docs/workflow/handoffs/2026-11-02T04-08-42-206Z-r227.json](workflow/handoffs/2026-11-02T04-08-42-206Z-r227.json)

## 今回の記録ファイル

- [gas-password-reset-release-20261102.md](gas-password-reset-release-20261102.md)：この配信・検証結果。
- [state.json](workflow/state.json)：配信タスクと検査条件・評価。
- [contexts/service.md](workflow/contexts/service.md)：本番反映状況の追記。
- [r228](workflow/handoffs/2026-11-02T07-01-01-374Z-r228.json)：配信の合格評価。
- [r229](workflow/handoffs/2026-11-02T07-01-08-807Z-r229.json)：本番反映完了の引き継ぎ。

ローカル専用の根拠は local-only/gas-password-reset-release-20261102/ に保持する。

- [approved-files.json](../local-only/gas-password-reset-release-20261102/approved-files.json)：承認対象とstaged34ファイルの照合。
- [baseline.json](../local-only/gas-password-reset-release-20261102/baseline.json)：値を出さない設定状態/移行番号/件数。
- [data-before.json](../local-only/gas-password-reset-release-20261102/data-before.json)、[data-after.json](../local-only/gas-password-reset-release-20261102/data-after.json)、[data-comparison.json](../local-only/gas-password-reset-release-20261102/data-comparison.json)：DB内で集計した匿名指紋と件数比較。
- [fly-deploy.log](../local-only/gas-password-reset-release-20261102/fly-deploy.log)、[fly-current.json](../local-only/gas-password-reset-release-20261102/fly-current.json)：配信/010正常終了と全2台のimage。
- [netlify-before.json](../local-only/gas-password-reset-release-20261102/netlify-before.json)、[netlify-current.json](../local-only/gas-password-reset-release-20261102/netlify-current.json)：公開先/対象SHA/ready。
- [runtime-check.json](../local-only/gas-password-reset-release-20261102/runtime-check.json)：設定検証/010内容一致/GAS GET到達。
- [public-get.json](../local-only/gas-password-reset-release-20261102/public-get.json)、[invalid-token-api.json](../local-only/gas-password-reset-release-20261102/invalid-token-api.json)：公開GET/ヘッダーと無効token拒否。
- [ci-status.json](../local-only/gas-password-reset-release-20261102/ci-status.json)、[ci-jobs.json](../local-only/gas-password-reset-release-20261102/ci-jobs.json)：CI実行と工程別結果。
- [request-desktop.png](../local-only/gas-password-reset-release-20261102/request-desktop.png)、[reset-mobile.png](../local-only/gas-password-reset-release-20261102/reset-mobile.png)、[ui-verification.json](../local-only/gas-password-reset-release-20261102/ui-verification.json)：実本番UIの画像と操作範囲。
- [inspect-production.mjs](../local-only/gas-password-reset-release-20261102/inspect-production.mjs)、[inspect-runtime.mjs](../local-only/gas-password-reset-release-20261102/inspect-runtime.mjs)：設定/DBを限定して読み取る自作検証コード。
- [workflow-check.log](../local-only/gas-password-reset-release-20261102/workflow-check.log)：進捗形式/依存/根拠参照の検査。
- [final-receipt.json](../local-only/gas-password-reset-release-20261102/final-receipt.json)：文書追送SHA・最終CI・Git同期を確認後に保存する控え。機能の配信SHAと区別する。

自作の `fly-gas-release-20261102.toml` は既存 [frontend/fly.toml](../frontend/fly.toml) と一致する一時コピーで、配信後に削除した。恒久の設定変更や他のファイル削除はない。
