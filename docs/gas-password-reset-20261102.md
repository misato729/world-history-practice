# GASによる期限付きリンクのパスワード再設定（2026-11-02）

ユーザーの完全自動化の依頼に従い、前段の管理者による仮パスワード発行を期限付きリンクへ置換した。設定は [GAS設定手順](gas-password-reset-setup.md) を正本とする。実装・検証はローカルのみ。GASアカウント設定、実メール、通常/本番DB、コミット・push・配信は未実施。

## 動作と保護

- `/forgot-password` で登録メールを申請。登録の有無にかかわらず202の同じ応答。未設定なら全メールに503。申請だけでは現在のパスワードやセッションを変えない。
- SQL010へuserごと1件、SHA-256のtoken digest・発行時の認証版・30分の期限を保存。32バイトの暗号乱数を43文字のbase64urlにする。新規申請で旧リンクを置換する。
- サイトのサーバーからGASへ、宛先・token・固定サイトorigin・時刻・request IDを含むUTF-8原文とHMAC-SHA256署名をPOST。ブラウザにGASの秘密鍵を渡さない。
- GASは署名、5分以内（未来も5分以内）、ID、単一宛先、token形式、設定origin一致を検査。ロック取得後にも時刻を再確認する。送信本文とリンク先はコード/設定で固定し、依頼から任意の本文・URLを受け付けない。
- GASは送信専用MailApp、scopeは `script.send_mail` のみ。受信箱・Drive・Sheetsの読み取りやGmailパスワードは不要。ScriptPropertiesには秘密鍵/設定とID・時刻・送信状態・日次件数だけを置き、宛先・token・メール本文を保存しない。
- IDの重複は再送しない。成功済みだけ同じIDへ成功を再応答し、失敗/不明は自動再送しない。ScriptLockで重複確認・件数・送信を直列化し、古い自作ID記録だけを10分後に整理。GASとサイト全体で20試行/UTC日、GASはGoogleの残送信枠も確認。メール3回/時・IP30回/15分・保存30回/15分を別に制限する。
- GASのURLは公式の `/exec` に限定（自動テストのみ127.0.0.1 HTTPを許可）。ContentServiceの302/303は `https://script.googleusercontent.com/macros/echo` へのGETだけ追跡し、署名付き本文を転送しない。15秒の共通タイムアウト、再送なし、IDの一致した成功JSONだけを受理する。
- 配送は202応答後に実行し、処理の存続をH3のwaitUntilへ登録する。永続キューではない。配送失敗・結果不明時には自分のtoken hashに一致するものだけを削除するため、遅い旧配送失敗が新しいリンクを消さない。ACK喪失・タイムアウトではメールが届いても無効になる場合があり、再申請を案内する。
- リンクのtokenはURLフラグメントに置き、HTTPアクセスログやRefererへ渡さない。画面読込後はアドレス欄から取り除き、コンポーネントのメモリだけに保持。ページはnoindex/no-referrer/no-store。再読込で失った場合はメールから開き直す。
- 新規保存はuser→tokenの順でロックし、ロック待ち後の実時刻の期限と認証版を確認。新しいbcryptハッシュ・認証版+1・token削除を単一トランザクションで保存。同時送信は1件だけ成功し、旧パスワード/旧ログインは失効。新しいパスワードでログインし直す。氏名・メール・ID・権限・作成日時・履歴・お気に入りを保持する。
- URL・本文・token・署名・宛先・例外詳細をログへ出さない。配送失敗は固定のカテゴリだけを記録する。

## 検証結果

2026-11-02に専用DB `world_history_gas_reset_test` と模擬HTTPリレーで確認。通常環境のDBや実Googleアカウントは読み書きしていない。

| 検査 | 結果・範囲 |
| --- | --- |
| 全体サーバー | 最終102件成功、失敗/skip 0。専用API9件を含む |
| 専用API | 匿名応答、hashのみ保存、30分期限、入力拒否で不変、同時利用1件のみ、旧パスワード/セッション失効、新規ログイン、履歴/お気に入り保持、ロック待機中の期限切れ、再申請/通常変更による旧リンク失効、遅延配送、配送拒否、旧配送失敗と新リンクの競合、全体送信枠、IP/メール/保存制限 |
| 全体フロント | 最終481件成功、失敗/skip 0。fragment1・relay3・GAS5を含む |
| GAS実コードの模擬実行 | UTF-8署名、改ざん/期限/宛先/別originの拒否、lock、重複排除、失敗時の再送禁止、quota/日次20、UTC日付境界、ロック待ち後の期限判定、設定/IDのみ保存、最小scope |
| リレー通信 | 署名、ID相関、GoogleのGETリダイレクト、悪意ある/307/非Google/認証付き/平文宛先やHTML応答の拒否、再送なし |
| 型検査・build | 成功。GASとテストだけの後続補強は最終テストで再確認。ローカルNode22.15.1の既存バージョン警告あり、CI/Dockerは既存のNode24構成 |
| template/diff | 成功 |
| PC/SP UI | 実Vue部品+合成APIで1440×1000/390×844/320×740。申請導線/503/受付/不一致/72byte/期限切れ/別リンク切替/完了時消去/再読込時無効/再申請、390/320横はみ出しなし |

画面検証は実際の保存やメールを行わない代替APIで、共通ヘッダー/フッターを省いた部品プレビュー。API・DBの保存と競合は別の隔離検証で確認した。初回はserver101/front480成功、その後レビューを受け時刻境界・全体配送枠を追加して102/481成功。実行失敗による手直しではない。

独立担当 `email_reset_review` が最終コード、設定手順、全検査ログ、6画像を確認してPASS。ロック後の期限判定・GAS日付/UTF-8・共有配送枠の追加検査も確認し、blocking指摘なし。検証用プレビューと専用DBは停止した。

## 今回の変更ファイル

作業開始時には前段の手動方式の未コミット差分があった。それらの既存変更と今回の実際の変更を区別する。開始時からの未変更ファイル・履歴、原資料、通常DBは削除・上書きしていない。

### 今回変更

- [.env.example](../.env.example)：既定は無効、GAS接続設定名だけを追加。
- [README.md](../README.md)：現行のリンク方式とGAS手順へ変更。
- [architecture.md](architecture.md)：手動管理APIを申請/再設定APIへ置換。
- [manual-password-reset-20261102.md](manual-password-reset-20261102.md)：前段の記録であることと後続方式を明示。
- [contexts/service.md](workflow/contexts/service.md)：方針変更・検証範囲の追記。
- [state.json](workflow/state.json)：新しい依頼タスクと条件/評価/引き継ぎ。
- [layouts/admin.vue](../frontend/app/layouts/admin.vue)：前段の手動メニューを除去しHEADと同じ内容へ復帰。
- [forgot-password.vue](../frontend/app/pages/forgot-password.vue)：問い合わせ案内をメール申請フォームへ変更。
- [nuxt.config.ts](../frontend/nuxt.config.ts)：再設定画面のSSR無効化とnoindex/no-referrer/no-store。
- [api/v1/[...path].ts](../frontend/server/api/v1/%5B...path%5D.ts)：手動管理APIを自動再設定へ置換。
- [rate-limit.ts](../frontend/server/core/rate-limit.ts)：申請/保存/全体配送の制限。

### 今回作成・復元

- [Code.gs](../frontend/automation/password-reset/Code.gs)：署名付き送信専用GAS。
- [appsscript.json](../frontend/automation/password-reset/appsscript.json)：V8/送信scope/例外ログ無効。
- [reset-password.vue](../frontend/app/pages/reset-password.vue)：リンク読込と再設定画面（旧SMTP試作を再利用）。
- [passwordReset.ts](../frontend/app/utils/passwordReset.ts)：フラグメントの制約（旧試作から復元）。
- [010_password_reset_tokens.sql](../frontend/server/database/migrations/010_password_reset_tokens.sql)：tokenテーブル。前段の使い捨てDBで使った旧試作と同じSQLを復元し、適用済み内容は書き換えていない。
- [password-reset.ts](../frontend/server/services/password-reset.ts)：期限付きリンクの発行/保存、GAS配送、失敗時失効。
- [password-reset-mail.ts](../frontend/server/services/password-reset-mail.ts)：GAS設定/署名/HTTP/ACK検査。
- [server-tests/password-reset.test.ts](../frontend/server-tests/password-reset.test.ts)：模擬GASと実DBのAPI9件。
- [tests/passwordReset.test.ts](../frontend/tests/passwordReset.test.ts)：fragmentの検証。
- [tests/passwordResetGas.test.ts](../frontend/tests/passwordResetGas.test.ts)：GAS実ソースの5件。
- [tests/passwordResetMail.test.ts](../frontend/tests/passwordResetMail.test.ts)：設定/通信の3件。
- [gas-password-reset-setup.md](gas-password-reset-setup.md)：ユーザーが行うGAS設定/有効化手順。
- [gas-password-reset-20261102.md](gas-password-reset-20261102.md)：この検証・変更一覧。
- [r226](workflow/handoffs/2026-11-02T04-08-37-828Z-r226.json)：今回の合格評価。
- [r227](workflow/handoffs/2026-11-02T04-08-42-206Z-r227.json)：ローカル実装完了の引き継ぎ。

GAS資材はfrontend配下へ置き、既存のDocker開発用COPY・Composeのマウント・CIの `npm test` から同じ実コードを検証できる配置にした。Dockerfile/Compose/CI定義の変更は不要で、本番イメージの追加コピーもない。

### 今回除去した前段の未追跡ファイル

手動方式の自作3ファイルを配信対象から除去。原本の控えをリンク先に保存した。

- [admin/password-reset.vue](../local-only/manual-password-reset-retired-20261102/frontend/app/pages/admin/password-reset.vue)：管理者発行画面。
- [admin-accounts.ts](../local-only/manual-password-reset-retired-20261102/frontend/server/services/admin-accounts.ts)：管理者発行API。
- [manual-password-reset.test.ts](../local-only/manual-password-reset-retired-20261102/frontend/server-tests/manual-password-reset.test.ts)：手動方式専用テスト。

同じ控えに、置換前の [forgot-password.vue](../local-only/manual-password-reset-retired-20261102/frontend/app/pages/forgot-password.vue) と [運用記録](../local-only/manual-password-reset-retired-20261102/docs/manual-password-reset-20261102.md) を保存。

### 開始前からあった差分を保持

[login.vue](../frontend/app/pages/login.vue) の案内リンク、[accounts.ts](../frontend/server/services/accounts.ts) と [password-validation.ts](../frontend/server/services/password-validation.ts) の既存検証共通化は継続利用し、今回追加した変更として数えない。[email-password-reset-20261102.md](email-password-reset-20261102.md)、引き継ぎr221〜r225、旧SMTPのlocal-only控えも書き換えていない。npm依存は追加せず、nodemailerは不使用。

### ローカル専用の検証ファイル

- [api.log](../local-only/gas-password-reset-20261102/api.log)、[server.log](../local-only/gas-password-reset-20261102/server.log)、[frontend.log](../local-only/gas-password-reset-20261102/frontend.log)：初回検査。
- [server-final.log](../local-only/gas-password-reset-20261102/server-final.log)、[frontend-final.log](../local-only/gas-password-reset-20261102/frontend-final.log)、[typecheck.log](../local-only/gas-password-reset-20261102/typecheck.log)、[build.log](../local-only/gas-password-reset-20261102/build.log)：最終検査。
- [workflow.log](../local-only/gas-password-reset-20261102/workflow.log)：進捗の形式・依存関係・根拠参照の検査。
- [request-desktop.png](../local-only/gas-password-reset-20261102/request-desktop.png)、[reset-desktop.png](../local-only/gas-password-reset-20261102/reset-desktop.png)、[request-mobile.png](../local-only/gas-password-reset-20261102/request-mobile.png)、[reset-mobile.png](../local-only/gas-password-reset-20261102/reset-mobile.png)、[expired-mobile.png](../local-only/gas-password-reset-20261102/expired-mobile.png)、[form-mobile.png](../local-only/gas-password-reset-20261102/form-mobile.png)：合成APIでの画像。
- [ui-verification.json](../local-only/gas-password-reset-20261102/ui-verification.json)：操作範囲。
- [preview.mjs](../local-only/gas-password-reset-20261102/preview.mjs)、[index.html](../local-only/gas-password-reset-20261102/index.html)、[main.mjs](../local-only/gas-password-reset-20261102/main.mjs)、[login.mjs](../local-only/gas-password-reset-20261102/login.mjs)、[forgot.mjs](../local-only/gas-password-reset-20261102/forgot.mjs)、[reset.mjs](../local-only/gas-password-reset-20261102/reset.mjs)：部品検証の一時プレビュー。
