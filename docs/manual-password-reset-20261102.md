# 問い合わせと管理者による手動パスワード再設定（2026-11-02）

> この手動方式は後続のユーザー依頼でGASによる期限付きリンク方式へ置換。以下は前段の検証履歴で、現在の利用手順ではない。[現行の設定手順](gas-password-reset-setup.md)。当時のソースと原記録は `local-only/manual-password-reset-retired-20261102/` に保持。

ユーザーの「利用は年に数回程度、固定費を避けて問い合わせ対応、管理者がランダムな値を発行し登録メール宛へ手動で送る」依頼に基づくローカル実装。

## 操作の流れ

1. 利用者はログイン画面の「パスワードを忘れた場合」から、登録メールアドレスで問い合わせる。
2. 管理者は問い合わせ元を確認し、管理メニュー「パスワード再設定」で登録メールを検索する。
3. 表示された氏名と登録メールを照合し、本人確認・送付先確認のチェックを入れ、管理者自身の現在のパスワードで再認証する。
4. ランダムな24文字の仮パスワードが発行される。コピーし、表示された登録メール宛へ管理者が手動で送付する。問い合わせのReply-To等をそのまま送付先にせず、画面の登録宛先を使う。
5. 利用者へ「仮パスワードでログイン後、アカウント設定から変更してください」と案内する。
6. 送付後は発行結果を閉じる。表示を閉じたりページを離れた後の再表示はできない。通信失敗等で結果が不明なら対象を確認し直して再発行し、最新の値だけを送る。

仮パスワードは本人の変更まで有効。次回変更の強制・期限・自動送信は設けず、管理者と利用者の運用で変更する。管理者アカウントはこの画面の発行対象外で、ログイン中の自身の変更は既存のアカウント設定を使う。

## 処理と保持

- 対象確認は `POST /api/v1/admin/password-resets/lookup`、発行は `POST /api/v1/admin/password-resets`。一般会員・未認証は拒否し、メールアドレスをURLへ入れない。
- DBから読み直した管理者の権限・認証版・パスワード、対象の一般会員区分・メール・確認時の版を、行ロック取得後に再確認する。複数行はID順にロックする。
- 暗号学的乱数18バイトをbase64urlへ変換し24文字を生成。DBへはbcryptハッシュだけを保存する。平文を記録・ログ・一覧・再取得APIへ残さず、no-storeの発行応答だけで表示する。
- ハッシュ更新・auth_version+1・更新日時を同一トランザクションで保存。旧パスワード/旧ログイン情報は失効する。対象のID、氏名、登録メール、権限、作成日時、履歴・お気に入り・他利用者を保持する。
- 同じ確認結果による二重発行は409で拒否。新しい登録情報を取得した上での再発行は可能。管理者単位で対象確認30回/5分、発行10回/15分を制限する。
- 既存の009までのスキーマを使うため追加のDBマイグレーションは不要。

## SMTP試作の取り扱い

[旧試作記録](email-password-reset-20261102.md)は不採用を明記し、元のコード/検証記録をlocal-onlyへ退避した。メール自動送信のAPI・再設定リンク画面・トークン処理・未公開SQL010・nodemailer・SMTP設定変数を現行配信対象から外した。SQL010は旧使い捨てDBでのみ適用し、通常/本番の適用済みSQLは変更していない。今回は別の `world_history_manual_reset_test` を使用。

SMTPサービスや新たなドメインの契約は不要。実際のメール送信は管理者が従来のメール手段で行う。この実装作業で実在利用者の再設定・送信、通常/本番DB変更、コミット・push・配信は行わない。

## 検証

専用APIテスト6件が成功。権限、管理者再認証、対象メール/版と確認、拒否時不変、競合/再発行、操作者のロック待機中失効、本人の仮パスワードログインから任意の値への変更、履歴・お気に入り・他会員の保持を確認した。全体のサーバーテスト99件、フロントテスト472件が失敗・スキップ0で成功。型検査・ビルド・テンプレート検査・`git diff --check`も成功した。

PC1440×1000、SP390×844/320×740で実際のVue部品と管理レイアウトを使い、未確認時の発行不可、登録先確認、誤った再認証のエラー、発行結果、コピーの完了表示、結果を閉じた後の消去、競合409時の対象消去、メニュー開閉、長いメールの折返し、ログインから問い合わせ案内への遷移を確認。390/320幅で横はみ出しがないことを確認した。問い合わせ画面はフォームを持たず、件名付きmailtoを案内する。

UIの通信・認証・コピー先は合成応答/ダミー宛先/模擬クリップボードで確認した。ブラウザで実在のパスワード変更やメール送信は行っていない。APIとDBの更新・競合・失効は別途上記の隔離DBで検証した。共通フッターとアイコンはUI検証用の代替表示であり、他の管理メニューの機能まで確認済みとはしない。

記録は `local-only/manual-password-reset-20261102/` に保存。独立担当 `email_reset_review` がコード・全体検査ログ・4画像を再確認しPASS。遅延した検索結果の入力一致ガードも確認し、blocking指摘なし。

## 変更ファイル

開始時の未コミット差分は、同じ依頼系列の未公開SMTP試作だった。これを今回の方針へ置き換え、無関係な既存ファイルや原資料は変更していない。以下はHEADからの最終差分と、旧試作から退役した自作ファイルを区別した一覧。

### 変更した追跡済みファイル

- [README.md](../README.md)：問い合わせ・手動発行の案内と運用記録へのリンク。
- [docs/architecture.md](architecture.md)：管理者用の確認/発行APIを追加。
- [docs/workflow/contexts/service.md](workflow/contexts/service.md)：運用方針変更と今回の検証範囲。
- [docs/workflow/state.json](workflow/state.json)：旧SMTP作業の履歴を保持し、新しい手動再設定タスクを記録。
- [frontend/app/layouts/admin.vue](../frontend/app/layouts/admin.vue)：管理メニューのリンク。
- [frontend/app/pages/login.vue](../frontend/app/pages/login.vue)：問い合わせ案内へのリンク（旧試作から継続）。
- [frontend/nuxt.config.ts](../frontend/nuxt.config.ts)：案内ページのnoindex/no-referrer。
- [frontend/server/api/v1/[...path].ts](../frontend/server/api/v1/%5B...path%5D.ts)：管理者APIを接続。
- [frontend/server/core/rate-limit.ts](../frontend/server/core/rate-limit.ts)：管理者ごとの確認/発行制限。
- [frontend/server/services/accounts.ts](../frontend/server/services/accounts.ts)：既存の新パスワード検証を同じ内容の共通定義へ移動（旧試作から継続）。

### 新規ファイル

- [frontend/app/pages/admin/password-reset.vue](../frontend/app/pages/admin/password-reset.vue)：登録先照合、再認証、仮パスワード発行・コピー・結果消去。
- [frontend/app/pages/forgot-password.vue](../frontend/app/pages/forgot-password.vue)：自動送信フォームを問い合わせ手順へ置換。
- [frontend/server/services/admin-accounts.ts](../frontend/server/services/admin-accounts.ts)：一般会員の確認と安全な手動再設定。
- [frontend/server/services/password-validation.ts](../frontend/server/services/password-validation.ts)：既存の8文字以上/72バイト以内の検証定義（旧試作から継続）。
- [frontend/server-tests/manual-password-reset.test.ts](../frontend/server-tests/manual-password-reset.test.ts)：専用APIテスト6件。
- [docs/manual-password-reset-20261102.md](manual-password-reset-20261102.md)：今回の運用・実装・検証記録。
- [docs/email-password-reset-20261102.md](email-password-reset-20261102.md)：旧試作の記録を不採用の履歴として保持。
- [r221](workflow/handoffs/2026-11-02T02-49-22-314Z-r221.json)、[r222](workflow/handoffs/2026-11-02T02-57-46-238Z-r222.json)、[r223](workflow/handoffs/2026-11-02T02-57-50-206Z-r223.json)：今回の方針変更前からあった未コミットのSMTP検証履歴を保持。
- [r224](workflow/handoffs/2026-11-02T03-48-55-317Z-r224.json)：今回の合格評価。
- [r225](workflow/handoffs/2026-11-02T03-49-09-738Z-r225.json)：ローカル実装完了の引き継ぎ。

### 旧試作から削除した未追跡ファイル

いずれも未コミットの自作試作。通常/本番の適用済みファイルではない。リンク先は削除前のローカル控え。

- [reset-password.vue](../local-only/email-password-reset-retired-20261102/frontend/app/pages/reset-password.vue)：リンクによる再設定画面を退役。
- [passwordReset.ts](../local-only/email-password-reset-retired-20261102/frontend/app/utils/passwordReset.ts)：リンク用UI検証を退役。
- [010_password_reset_tokens.sql](../local-only/email-password-reset-retired-20261102/frontend/server/database/migrations/010_password_reset_tokens.sql)：未公開のトークンテーブル追加を退役。
- [password-reset.ts](../local-only/email-password-reset-retired-20261102/frontend/server/services/password-reset.ts)：自動メールのトークン処理を退役。
- [password-reset-mail.ts](../local-only/email-password-reset-retired-20261102/frontend/server/services/password-reset-mail.ts)：SMTP送信を退役。
- [server-tests/password-reset.test.ts](../local-only/email-password-reset-retired-20261102/frontend/server-tests/password-reset.test.ts)：旧APIテストを退役。
- [tests/passwordReset.test.ts](../local-only/email-password-reset-retired-20261102/frontend/tests/passwordReset.test.ts)：旧UIテストを退役。

`.env.example`・`frontend/package.json`・`frontend/package-lock.json`は旧SMTPの追記/依存を除去しHEADと同じ内容へ戻ったため、最終Git差分に含まれない。

### ローカル専用の今回の作成物

- [api.log](../local-only/manual-password-reset-20261102/api.log)、[server.log](../local-only/manual-password-reset-20261102/server.log)、[frontend.log](../local-only/manual-password-reset-20261102/frontend.log)、[typecheck.log](../local-only/manual-password-reset-20261102/typecheck.log)、[build.log](../local-only/manual-password-reset-20261102/build.log)：合成データの検証ログ。
- [admin-desktop.png](../local-only/manual-password-reset-20261102/admin-desktop.png)、[admin-mobile.png](../local-only/manual-password-reset-20261102/admin-mobile.png)、[contact-desktop.png](../local-only/manual-password-reset-20261102/contact-desktop.png)、[contact-mobile.png](../local-only/manual-password-reset-20261102/contact-mobile.png)：ダミー宛先のUIスクリーンショット。
- [ui-verification.json](../local-only/manual-password-reset-20261102/ui-verification.json)：UI確認の範囲。
- [preview.mjs](../local-only/manual-password-reset-20261102/preview.mjs)、[index.html](../local-only/manual-password-reset-20261102/index.html)、[main.mjs](../local-only/manual-password-reset-20261102/main.mjs)、[login.mjs](../local-only/manual-password-reset-20261102/login.mjs)、[forgot.mjs](../local-only/manual-password-reset-20261102/forgot.mjs)、[admin.mjs](../local-only/manual-password-reset-20261102/admin.mjs)、[layout.mjs](../local-only/manual-password-reset-20261102/layout.mjs)、[scoped.css](../local-only/manual-password-reset-20261102/scoped.css)：実部品を合成APIで検証するための一時プレビュー。

旧試作の控えは上記の退役7ファイルに加え、[.env.example](../local-only/email-password-reset-retired-20261102/.env.example)、[README.md](../local-only/email-password-reset-retired-20261102/README.md)、[architecture.md](../local-only/email-password-reset-retired-20261102/docs/architecture.md)、[旧記録](../local-only/email-password-reset-retired-20261102/docs/email-password-reset-20261102.md)、[forgot-password.vue](../local-only/email-password-reset-retired-20261102/frontend/app/pages/forgot-password.vue)。秘密の接続値は含めない。
