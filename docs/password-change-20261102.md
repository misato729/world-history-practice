# アカウント設定からのパスワード変更

確認日：2026年11月2日。ユーザーの機能追加依頼に基づくローカル実装。コミット・push・本番DB変更・デプロイは未実施。

## 動作

- アカウント設定で現在のパスワード、新パスワード（8文字以上・72バイト以内）、確認入力を要求する。同じパスワードへの変更は拒否。
- `PATCH /api/v1/me/password` は認証、会員単位15分10回の制限、入力検証、ロック後の認証版と現在パスワード確認を行う。新しいbcryptハッシュ、認証版+1、更新日時だけをトランザクションで保存する。
- 新セッションを操作中の画面へ返し、旧セッションを失効。旧Rails形式・版なしのトークンは認証版0として既存ログインを維持し、変更後には拒否する。
- 変更前の認証で開始された削除処理もロック後に認証版とパスワードを再確認する。
- 通常DBと本番DBへ009は適用していない。配信時にはAPI更新前に共通のdb:migrateで009を適用する必要がある。メールによる忘れたパスワードの再設定は対象外。

## 検証

- 隔離したPostgreSQL16の `world_history_password_test` のみを使用。通常DB・本番・問題原稿・実利用者情報を持ち込んでいない。
- API 12/12、認証composable 15/15成功。未認証・不正入力・未変更時の全列保持・競合1成功/1失効・旧/legacyトークン失効・旧パスワード拒否/新パスワードログイン・他会員・履歴・お気に入り保持・回数制限を確認。
- サーバー全93件の初回は92成功、演習結果の1件が検証用SECRET_KEY_BASE未設定で失敗。合成の64文字以上のキーを設定して該当ファイル3/3成功。スキップ0。
- フロント全472件の初回は470成功・2失敗。依存ライブラリのHTTPSテストはローカル待受制限が原因で、許可されたローカル通信で該当3/3成功。残る文字サイズテストは変更前のHEADにも存在するindex.vueのclamp(2rem, 3vw, 3rem)で失敗し、今回修正していない。全472件の完全成功とは報告しない。
- `npm run typecheck`、`npm run build`、`git diff --check` 成功。Node22.15.1への既存の推奨バージョン警告あり。
- Chromeで実際のaccount.vueと共通/scoped CSSをコンパイルした検証画面を操作。保存処理と会員は合成応答であり、通常のNuxt画面全体・実APIとの結合確認とは区別する。ブラウザで実在アカウントの認証情報を変更していない。検証ハーネスのVue feature flagおよびPAYMENTS_ENABLED未登録警告はあり、一般会員・決済なしの表示で確認した。
- PC1440/SP390/SP320で横はみ出しなし。確認不一致、現在入力のエラー、送信中入力/ボタン無効化、成功表示と全パスワード欄消去を確認。再読込後の空フォームも確認。実DBでの変更永続化はAPIテストで新セッションGETと再ログインを確認。
- 独立レビューpassword_change_reviewの初回指摘：旧認証で開始したDELETEがパスワード更新のロックを待ってから削除できた。削除の認証版/パスワード確認をロック後に移動して解消。再レビューで追加の要修正なし。レビュー担当はコードの読取確認のみで、テスト/UIは実装担当の実行結果。

## ファイル一覧

- [frontend/app/pages/account.vue](../frontend/app/pages/account.vue)：現在・新規・確認入力、送信中無効化、結果表示、成功時入力消去。
- [frontend/app/composables/useAuth.ts](../frontend/app/composables/useAuth.ts)：変更API呼出しと新セッション保存、遅延応答のログアウト後復帰防止。
- [frontend/server/services/accounts.ts](../frontend/server/services/accounts.ts)：認証・入力検証・行ロック付き更新、削除時のロック後認証再確認。
- [frontend/server/core/auth.ts](../frontend/server/core/auth.ts)：auth_versionを署名トークンへ格納・DB値と照合、旧形式は0として互換。
- [frontend/server/core/rate-limit.ts](../frontend/server/core/rate-limit.ts)：会員単位で15分10回の変更制限。
- [frontend/server/database/migrations/009_password_auth_version.sql](../frontend/server/database/migrations/009_password_auth_version.sql)：利用者へauth_version追加。既存値は0。
- [frontend/server-tests/api.test.ts](../frontend/server-tests/api.test.ts)：入力・競合・旧形式失効・履歴/お気に入り/他利用者保持・再ログイン・制限の検証。
- [frontend/tests/auth.test.ts](../frontend/tests/auth.test.ts)：セッション交換と遅延応答の回帰テスト。
- [docs/architecture.md](../docs/architecture.md)：変更APIの仕様。
- [docs/password-change-20261102.md](../docs/password-change-20261102.md)：今回の実装・確認範囲と変更ファイル。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md)：現在の実装状況。
- [docs/workflow/state.json](../docs/workflow/state.json)：受入条件・評価・進捗。
- 今回の不変の評価・引き継ぎ記録を追加（正確なファイル名は後述）。

ローカル専用の検証補助（送信対象外）：

- [preview.mjs](../local-only/password-change-20261102/preview.mjs)：実部品の検証画面を準備する。
- [account.mjs](../local-only/password-change-20261102/account.mjs)、[account.css](../local-only/password-change-20261102/account.css)、[index.html](../local-only/password-change-20261102/index.html)、[main.mjs](../local-only/password-change-20261102/main.mjs)：検証画面の生成物。
- [desktop.png](../local-only/password-change-20261102/desktop.png)、[mobile320.png](../local-only/password-change-20261102/mobile320.png)：実部品と合成会員による表示確認。
- [api.log](../local-only/password-change-20261102/api.log)：実行した検査の出力。
- [unit.log](../local-only/password-change-20261102/unit.log)：実行した検査の出力。
- [auth.log](../local-only/password-change-20261102/auth.log)：実行した検査の出力。
- [server.log](../local-only/password-change-20261102/server.log)：実行した検査の出力。
- [practice.log](../local-only/password-change-20261102/practice.log)：実行した検査の出力。
- [dependency.log](../local-only/password-change-20261102/dependency.log)：実行した検査の出力。
- [typecheck.log](../local-only/password-change-20261102/typecheck.log)：実行した検査の出力。
- [build.log](../local-only/password-change-20261102/build.log)：実行した検査の出力。

評価記録：

- [初回評価・r212](workflow/handoffs/2026-11-02T01-59-22-529Z-r212.json)
- [再評価・r213](workflow/handoffs/2026-11-02T01-59-57-503Z-r213.json)
- [完了引き継ぎ・r214](workflow/handoffs/2026-11-02T02-00-21-268Z-r214.json)
