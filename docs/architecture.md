# 世界史ラボのAPI・DB・運用

## 構成

| 層 | 構成・役割 |
| --- | --- |
| 画面 | Nuxt 4。問題演習・会員画面・管理画面 |
| API | Nuxt同梱のNitro / TypeScript。認証・問題管理・採点・利用権限・決済処理 |
| DB | PostgreSQL。教材・大問・共通本文・小問・選択肢・利用者・履歴・会員資格等 |
| 共通設定 | `config/exam.json`。試験固有の公開設定 |
| 検証用サンプル | `content/questions.json`。合成テスト・空DBへの明示取込用。実問題の更新元にはしない |

世界史ラボ（仮称）は、元サービスから独立したリポジトリ・環境変数・DBを持ちます。公開先は未定です。`site.id`をサービスごとに変え、ログインCookieの名前も分離します。元のサービスの環境やDBへ接続する設定は含めません。開発用Composeは`frontend`（画面・API）と`db`で構成します。APIの接続先は同一オリジンの`/api/v1`です。Ruby/Railsのプロセスは起動しません。

トップや試験概要はサーバー側で本文を生成します。問題演習・履歴・管理画面等はブラウザ側で動作します。APIの権限検査は表示方法に依存しません。

現在の通常ローカルDBは「知識と情報の記録・伝達」1大問8小問（四択6・語句記述2）です。公式過去問や本番全体の模擬試験ではありません。課金・販売は無効で、価格・決済手段・運営者情報は未確定です。

「教材 → 大問 → 小問」を管理します。旧5問を保持した構造移行の検証後、明示依頼により8問へ入れ替えました。対応する構成は従来の体験教材、1大問7問又は8問の大問演習、4大問・合計30問の模試です。大問形式の問題が登録・公開された件数と、対応機能の実装は別に扱います。

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
- APIの問題取得レスポンスは、回答前に正答・許容表記・解説・出典を含めません。回答APIで判定結果と解説・出典を返します。
- 無料モードでは全公開問題とログイン後のお気に入りを利用できます。
- 課金機能を有効にした場合は、問題一覧・取得・回答・履歴・お気に入りの各APIで利用資格を確認します。

## 教材の構成と回答形式

`exam_sets.format_code` は `legacy_practice`・`group_practice`・`rekiken_mock` のいずれかです。従来形式の必要問数は `exam.questions_per_exam`（現在5問）、大問形式は `exam.formats` の構成を使用します。追加教材の番号枠は `exam.set_count`（現在2枠）で管理し、枠を増やしても問題は自動作成しません。

大問には本文A・B等を保存し、小問は同じ大問の本文全体又は参照箇所を指定します。小問は主分類1組と複数の関連章節を持ち、章・節の絞り込みでは同じ分類リンク内で両条件を照合します。大問から小問へ分類を一括継承しません。

回答形式は正答1件の `single_choice` と語句記述の `short_text` です。短答は `accepted_answers` の先頭を模範解答、後続を許容表記とし、NFKC正規化と前後空白の除去後に一致を判定します。`input_constraints` で文字種（指定なし・漢字・カタカナ）、指定文字数・最大文字数・入力案内を保存します。論述採点、制限時間、一括提出による受験セッションは含みません。

`GET /exams` は公開された実在小問の `question_numbers` と大問構成・利用条件を返すカタログです。ホーム・サイドバー・演習順序はこの一覧を使い、設定上の固定問数から存在しない問題へのリンクを作りません。URLの `question_number` は維持し、表示順は大問番号・大問内小問番号で管理します。

## APIの入口

全て`/api/v1`以下です。入口は`frontend/server/api/v1/[...path].ts`、処理は`frontend/server/services/`、共通の認証・DB・エラー処理は`frontend/server/core/`にあります。回帰テストは`frontend/server-tests/`を参照してください。

| 用途 | メソッド・パス |
| --- | --- |
| 稼働確認 | `GET /health` |
| 会員登録・ログイン | `POST /auth/signup`・`POST /auth/login` |
| 自分の情報・退会 | `GET /me`・`DELETE /me` |
| 利用可能な演習セット | `GET /exams` |
| 公開教材の大問一覧 | `GET /exams/:exam_number/groups` |
| 問題取得・次問取得 | `GET /questions/:id`・`GET /questions/next` |
| 回答 | `POST /questions/:id/answer` |
| 回答履歴 | `GET /answer_histories`・`GET /answer_histories/:id` |
| お気に入り一覧 | `GET /favorites` |
| お気に入り登録・解除 | `PUT /questions/:question_id/favorite`・`DELETE /questions/:question_id/favorite` |
| 管理用問題一覧・作成 | `GET /admin/questions`・`POST /admin/questions` |
| 管理用問題取得・更新・削除 | `GET`・`PATCH`・`DELETE /admin/questions/:id` |
| 管理用教材一覧・取得・更新 | `GET /admin/exams`・`GET`・`PATCH /admin/exams/:exam_number` |
| 大問作成・取得・更新・削除 | `POST /admin/exams/:exam_number/groups`・`GET`・`PUT`・`DELETE /admin/question_groups/:id` |
| 教材の公開条件検査・公開 | `POST /admin/exams/:exam_number/validate`・`POST /admin/exams/:exam_number/publish` |
| 決済設定・購入開始 | `GET /payments/config`・`POST /payments/checkout_sessions` |
| Stripeイベント受信 | `POST /webhooks/stripe` |

画面のURLは試験番号と問題番号を使用します。APIの`:id`には問題IDを使います。試験番号を指定して順に取得する場合は、例えば`GET /questions/next?exam_number=1&after_question_number=0`でセット1の最初の公開問題を取得します。

管理画面の入口は `/admin/exams`（教材・大問）と `/admin/questions`（小問一覧）です。教材・小問の書込はそれぞれ `{ "exam": ... }`・`{ "question": ... }`、大問の書込は `{ "group": ... }` で送ります。大問更新では共通本文と現在所属する全小問IDの順序を一括保存し、一覧から外す操作で小問を削除しません。

管理更新には `lock_version` を渡し、競合時は409で再読込を求めます。新しい回答は `answer_type`・`question_version`・`submission_key` と、選択肢ID又は入力語を送ります。出題後に内容が変われば409で再読込を求め、同じ利用者の同じキー・同じ回答の再送は履歴を重複作成しません。移行前の未変更四択に限る旧回答互換は、新しい画面の送信方式とは区別します。

## DBの主なテーブル

| テーブル | 内容 |
| --- | --- |
| `users` | 会員・管理者。役割は一般ユーザーと管理者 |
| `exam_sets` | 教材番号・名称・構成・公開状態・編集バージョン |
| `question_groups` | 教材内の大問番号・名称・予定小問数・公開状態 |
| `group_passages` | 大問の共通本文、A・B等のラベル、表示順 |
| `questions` | 通し番号・大問所属・大問内番号、回答形式・採点条件、分類、本文、解説、出典、公開状態・内容／編集バージョン |
| `question_choices` | 選択肢、表示順、正答フラグ |
| `question_topic_links` | 主分類と関連章節の学習範囲リンク |
| `question_passage_references` | 小問から同じ大問の本文全体・参照箇所への依存 |
| `answer_histories` | 選択肢又は入力語、判定、内容バージョン、重複送信防止キー |
| `favorites` | 利用者と問題のお気に入り関係 |
| `memberships` | 有料会員の利用資格 |
| `payments` | 決済状態とStripeとの照合情報 |
| `stripe_webhook_events` | 受信イベントの処理状態・重複処理防止 |
| `verification_access_grants` | 期限付きの運用確認用利用資格 |
| `api_rate_limit_buckets` | APIの操作回数制限 |
| `nitro_schema_migrations` | 適用したSQLファイルとSHA-256の記録 |

スキーマの正本は`frontend/server/database/migrations/*.sql`です。`npm run db:migrate`が番号順に適用し、ファイル名とSHA-256を記録します。適用済みファイルが変更されていれば拒否するため、変更は新しい番号のSQLに追加します。既存のRailsの`schema_migrations`と`ar_internal_metadata`は削除しません。

マイグレーションは専用のトランザクションアドバイザリロックで同時実行を直列化します。問題・大問の書込、一括取込、採点は共通の学習用ロックとトランザクションを使い、更新・回答対象の問題行もロックします。購入・退会処理はユーザー行をロックして整合を保ちます。

同じ試験セット内の問題番号、同じ問題内の選択肢ラベルと表示順は一意です。正答フラグには、複数の正答を登録しないためのDB制約があります。試験ごとの問題数・選択肢数と分類の対応は共通設定を使ってAPI側で検査します。

大問と小問の教材一致は複合外部キーで保護し、本文参照はWriterで同じ大問に限定します。公開検査では構成ごとの大問・小問数、本文、参照先、正答、解説、出典を検査します。一般APIは小問だけでなく親教材・大問の公開状態も確認します。未完成の保存は教材を非公開にしてから行い、公開中の大問形式教材を不整合にする更新は取り消します。

小問の本文・正答・選択肢・解説・出典・採点条件・本文参照を変えると、その小問の履歴を削除し `content_version` を増やします。共通本文を変えると、その本文IDを参照する小問だけを同様に更新します。分類・表示順だけの変更や同じ内容の再保存では履歴を削除しません。内容編集で問題・選択肢IDを作り直さず、お気に入りや対象外小問の履歴を保持します。過去本文を保存する履歴版テーブルは導入していません。

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

共通本文は文字列の代わりに `inlines` を持てます。使用できる要素は通常の `text`、安定したID・表示ラベル・本文を持つ `anchor`、ID・表示ラベルを持つ `blank` です。参照IDの重複・参照切れを検査し、任意HTMLを保存・実行せずVue要素で描画します。`passage_references.anchor_id = null` は本文全体への依存です。

出典は従来の `source_text` に加え、`source_references` に書籍の `book` とWeb資料の `web` を保存できます。書名・版・刊行年・章節・確認箇所等を記録し、書籍のURLは任意、Webは公開時にHTTPS URLが必要です。ローカル原資料・全文OCR・端末内のファイルパスを問題DBへ含めません。新形式を使う問題では旧文字列を独立編集せず、回答後に構造化出典を表示します。

## 初期データ・アーカイブ

`content/questions.json` はv1形式の合成テスト・検証用サンプルです。`npm run operations -- questions:import_content` で空のDBへ明示取込できますが、実問題の更新元にはしません。通常の問題編集は管理画面・管理APIで行い、起動や再デプロイによる再投入で更新しません。開発用の空DBへサンプルを入れる既存seedは残っています。

DBからの問題データ書き出しには`npm run operations -- questions:export`、書き出した検証値付きアーカイブの取込には`npm run operations -- questions:import`を利用します。いずれも入力・出力先を明示する操作です。問題アーカイブは利用者・履歴・決済を含まないため、DB全体のバックアップの代わりにはなりません。

書き出しはv2形式で、教材・大問・共通本文・小問・短答条件・分類リンク・出典・本文参照を含みます。件数とSHA-256、所属・参照・公開構成を検査し、小問・選択肢・大問・共通本文が空のDBへトランザクションで取り込みます。大問・本文の輸送用IDは取込先IDへ対応付け直します。旧v1アーカイブと `schema_version: 1` のサンプルJSONの読込も維持しています。取込は既存DBの編集や、問題IDを保ったDB全体の復旧を代替しません。

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

公開した小問は `answer_type_locked` を保持し、下書きへ戻しても回答形式を変えられません。形式を変える場合は新しい小問として登録します。006移行時は現在公開中の問題だけを対象とし、既存の下書き・非公開問題の過去は推測しません。DBバックアップは固定状態も保全します。コンテンツのv2アーカイブは新しいDBへの取込用であり、固定の過去履歴やIDの復元には使用しません。
