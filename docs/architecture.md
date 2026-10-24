# 世界史ラボのAPI・DB・運用

## 構成

| 層 | 構成・役割 |
| --- | --- |
| 画面 | Nuxt 4。問題演習・会員画面・管理画面 |
| API | Nuxt同梱のNitro / TypeScript。認証・問題管理・採点・利用権限・決済処理 |
| DB | PostgreSQL。問題・選択肢・利用者・履歴・会員資格等 |
| 共通設定 | `config/exam.json`。試験固有の公開設定 |
| 初期問題 | `content/questions.json`。空のDB向けの明示的な初期データ |

世界史ラボ（仮称）は、元サービスから独立したリポジトリ・環境変数・DBを持ちます。公開先は未定です。`site.id`をサービスごとに変え、ログインCookieの名前も分離します。元のサービスの環境やDBへ接続する設定は含めません。開発用Composeは`frontend`（画面・API）と`db`で構成します。APIの接続先は同一オリジンの`/api/v1`です。Ruby/Railsのプロセスは起動しません。

トップや試験概要はサーバー側で本文を生成します。問題演習・履歴・管理画面等はブラウザ側で動作します。APIの権限検査は表示方法に依存しません。

現在は自作の四択5問を1つの体験演習セットとして収録しています。公式過去問や本番全体の模擬試験ではありません。課金・販売は無効で、価格・決済手段・運営者情報は未確定です。

ホームの「利用にあたって」は、項目名と説明を細い横線で区切る案内欄です。PCでは左右、スマートフォンでは上下に配置し、カードや装飾アイコンは使いません。無料範囲・金額・プレミアム案内の表示は共通設定に従います。

## ローカル環境と環境変数

Composeプロジェクトは`world-history-practice`、開発DBは`world_history_development`、テストDBは`world_history_test`、DBユーザーは`world_history`です。学習画面とAPIは`http://localhost:3200`、互換APIポートは`3201`、ホストからのDB接続は`127.0.0.1:55433`です。`3201`も同じNuxtプロセスへの別名であり、別のAPIサーバーではありません。

Composeはルートの`.env`を`env_file`経由でコンテナへ渡します。Nuxtの開発・ビルドコマンドにはNuxt自身の`.env`読込がありますが、`frontend/`で動かすコマンドへルートの`.env`が自動で渡ることを前提にしないでください。運用CLIを呼ぶ通常のNode.jsや`npm run db:migrate`等は`.env`を自動で読み込みません。本番のビルド成果物も実行環境から環境変数を受け取ります。

Dockerを使わずにCLIだけを実行する場合は、環境変数を渡すかNode.jsの`--env-file`を明示します。例えば、既存のローカル開発DBへ接続するマイグレーションは次の形です。実行前に接続対象とバックアップを確認してください。

```bash
cd frontend
PGHOST=127.0.0.1 PGPORT=55433 PGDATABASE=world_history_development \
  node --env-file=../.env --experimental-strip-types server/operations/cli.ts db:migrate
```

DB接続は`DATABASE_URL`が優先されます。未指定時は`PGHOST`・`PGPORT`・`PGDATABASE`・`PGUSER`・`PGPASSWORD`、次に`DB_HOST`・`DB_PORT`・`DB_NAME`・`POSTGRES_USER`・`POSTGRES_PASSWORD`を使用します。旧構成の`DB_INTERNAL_PORT`は使いません。ホストとコンテナでDBのポートが異なるため、Compose内では`db:5432`、ホスト上では`127.0.0.1:55433`を指定します。

## 基本動作と認証

- 問題演習URLは`/practice/{examNumber}/{questionNumber}`です。
- 未ログインの回答はDBへ保存しません。ログインユーザーの回答は履歴へ保存します。
- 一般画面と管理画面は同じログイン情報を使います。管理APIは`role=admin`だけが利用できます。
- APIの問題取得レスポンスは、回答前に正答・解説を含めません。回答APIで判定結果を返します。
- 無料モードでは全公開問題とログイン後のお気に入りを利用できます。
- 課金機能を有効にした場合は、問題一覧・取得・回答・履歴・お気に入りの各APIで利用資格を確認します。

## APIの入口

全て`/api/v1`以下です。入口は`frontend/server/api/v1/[...path].ts`、処理は`frontend/server/services/`、共通の認証・DB・エラー処理は`frontend/server/core/`にあります。回帰テストは`frontend/server-tests/`を参照してください。

| 用途 | メソッド・パス |
| --- | --- |
| 稼働確認 | `GET /health` |
| 会員登録・ログイン | `POST /auth/signup`・`POST /auth/login` |
| 自分の情報・退会 | `GET /me`・`DELETE /me` |
| 利用可能な演習セット | `GET /exams` |
| 問題取得・次問取得 | `GET /questions/:id`・`GET /questions/next` |
| 回答 | `POST /questions/:id/answer` |
| 回答履歴 | `GET /answer_histories`・`GET /answer_histories/:id` |
| お気に入り一覧 | `GET /favorites` |
| お気に入り登録・解除 | `PUT /questions/:question_id/favorite`・`DELETE /questions/:question_id/favorite` |
| 管理用問題一覧・作成 | `GET /admin/questions`・`POST /admin/questions` |
| 管理用問題取得・更新・削除 | `GET`・`PATCH`・`DELETE /admin/questions/:id` |
| 決済設定・購入開始 | `GET /payments/config`・`POST /payments/checkout_sessions` |
| Stripeイベント受信 | `POST /webhooks/stripe` |

画面のURLは試験番号と問題番号を使用します。APIの`:id`には問題IDを使います。試験番号を指定して順に取得する場合は、例えば`GET /questions/next?exam_number=1&after_question_number=0`でセット1の最初の公開問題を取得します。

## DBの主なテーブル

| テーブル | 内容 |
| --- | --- |
| `users` | 会員・管理者。役割は一般ユーザーと管理者 |
| `questions` | 試験番号・問題番号、分類、本文、解説、出典、公開状態 |
| `question_choices` | 選択肢、表示順、正答フラグ |
| `answer_histories` | 利用者の回答と判定 |
| `favorites` | 利用者と問題のお気に入り関係 |
| `memberships` | 有料会員の利用資格 |
| `payments` | 決済状態とStripeとの照合情報 |
| `stripe_webhook_events` | 受信イベントの処理状態・重複処理防止 |
| `verification_access_grants` | 期限付きの運用確認用利用資格 |
| `api_rate_limit_buckets` | APIの操作回数制限 |
| `nitro_schema_migrations` | 適用したSQLファイルとSHA-256の記録 |

スキーマの正本は`frontend/server/database/migrations/*.sql`です。`npm run db:migrate`が番号順に適用し、ファイル名とSHA-256を記録します。適用済みファイルが変更されていれば拒否するため、変更は新しい番号のSQLに追加します。既存のRailsの`schema_migrations`と`ar_internal_metadata`は削除しません。

マイグレーションは専用のトランザクションアドバイザリロックで同時実行を直列化します。問題の書込・一括取込は共通ライターとアドバイザリロックを使い、回答時は問題行、購入・退会処理はユーザー行をロックして整合を保ちます。

同じ試験セット内の問題番号、同じ問題内の選択肢ラベルと表示順は一意です。正答フラグには、複数の正答を登録しないためのDB制約があります。試験ごとの問題数・選択肢数と分類の対応は共通設定を使ってAPI側で検査します。

## 表示ブロック

問題・解説・選択肢はHTML文字列ではなく、配列の表示ブロックで保存します。

| 種類 | 用途・主な属性 |
| --- | --- |
| `text` | 通常文。`text` |
| `quote` | 引用文。`text`、任意の`source` |
| `fill_in_text`・`fill_in_quote` | 空欄付き本文。`text`内に`{{①}}`等を記載 |
| `table` | 表。文字列配列の`headers`、同じ列数の`rows` |
| `code` | プログラム。`code`、任意の`title` |
| `code_group` | 複数プログラムの比較。`items`に`code`と任意の`title` |
| `fill_in_choice` | 空欄に対応する選択肢の語句。文字列配列の`cells` |

問題本文は上記のうち`fill_in_choice`以外、解説は`text`・`quote`・`table`・`code`、選択肢は`text`・`table`・`fill_in_choice`を利用できます。穴埋めの空欄ラベルと、全選択肢のセル数をそろえます。

## 初期データ・アーカイブ

`content/questions.json`は手で編集するための初期問題です。`npm run operations -- questions:import_content`で空のDBへ取り込み、既存問題は上書きしません。

DBからの問題データ書き出しには`npm run operations -- questions:export`、書き出した検証値付きアーカイブの取込には`npm run operations -- questions:import`を利用します。いずれも入力・出力先を明示する操作です。問題アーカイブは利用者・履歴・決済を含まないため、DB全体のバックアップの代わりにはなりません。

```bash
# コンテナ内に新しいファイルを作成する。既存ファイルへの上書きは拒否する。
docker compose exec \
  -e OUTPUT=/tmp/questions-export.json frontend npm run operations -- questions:export

# ファイルをホストへ回収する。
docker compose cp \
  frontend:/tmp/questions-export.json ./questions-export.json
```


運用CLIの入口は`frontend/server/operations/cli.ts`です。`node --experimental-strip-types`で同じTypeScriptのサービス・DB処理を呼び出し、件数・安全な状態情報だけを出力します。認証情報、問題本文、利用者のメールアドレス、Stripeイベント本文は結果に含めません。

| 操作名（`npm run operations --`の後に指定） | 入力する環境変数 |
| --- | --- |
| `db:migrate` | DB接続。必要な場合のみ`MIGRATIONS_DIR` |
| `db:seed` | 開発環境のみ。任意の`INPUT` |
| `questions:import_content` | `CONFIRM=IMPORT_INTO_EMPTY_DATABASE`、任意の`INPUT` |
| `questions:import` | `CONFIRM=IMPORT_INTO_EMPTY_DATABASE`、`INPUT` |
| `questions:export` | 未使用の出力先`OUTPUT` |
| `admin:create` | `ADMIN_EMAIL`・`ADMIN_PASSWORD`、任意の`ADMIN_NAME` |
| `verification_access:grant` | `USER_EMAIL`・`EXPIRES_AT`・`REASON`・`GRANTED_BY` |
| `verification_access:revoke` | `USER_EMAIL` |
| `payments:expire_pending_checkouts` | `USER_EMAIL`、対象環境のStripe秘密鍵とモード設定 |
| `operations:audit` | DB接続と対象環境の設定。更新やStripe通信は行わない |
| `operations:restore_drill` | ローカルtest用接続、販売・外部通知を無効にする |

検証用資格は付与時から7日以内の期限付きで、監査用の理由・担当者を必須とします。同じユーザーに再付与せず、解除しても記録を維持します。pending決済の期限切れ処理はStripeの状態を照合してから実行し、支払済み資格を直接作成しません。

`operations:audit`は24時間超のpending、直近1日の返金失敗、異議申立て中、失効済み決済に紐づくactive資格等を件数で報告します。問題アーカイブ・DBバックアップ・復元演習の役割と操作は[移行・復元手順](migration.md)を参照してください。

## 検証と配信

このサービスで実施した検証と残る確認は[検証記録](verification.md)を参照してください。以下は運用時に必要な確認方法の説明です。

画面の単体テストは`npm test`、API・運用のテストは`npm run test:server`、型検査と本番ビルドは`npm run typecheck`・`npm run build`です。APIの統合テストはPostgreSQLに接続して実行します。DB接続がない場合に統合テストがスキップされるため、成功件数だけでDB検証済みと判断しないでください。

本番の配信先・DB・ドメイン・秘密情報・監視先は、派生サービスごとに設定します。テンプレートには自動的に既存サービスへ配信する設定を持たせません。配信前には実際の公開URLとAPIの接続、PC・スマートフォン表示、認証と管理権限を確認します。課金する場合は購入からWebhook・利用資格・返金まで対象環境で確認します。
