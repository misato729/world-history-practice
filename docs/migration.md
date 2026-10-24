# 世界史ラボのDB移行・バックアップ・復元

この手順は世界史ラボ（仮称）のデータを保ちながら構成を更新するためのものです。実施結果は[検証記録](verification.md)を参照してください。課金・販売は無効で、公開先は未定です。

## 現在の構成

Nuxt 4の画面とNitroのTypeScript APIを、1つのNode.jsプロセスで配信します。Composeのサービスは`frontend`とPostgreSQL 16の`db`です。Ruby、Rails API、別のAPIサーバーは不要です。

本番イメージの起動は`npm run db:migrate`の後に`node .output/server/index.mjs`を実行します。自動seedは実行しません。開発イメージだけがマイグレーション後に`npm run db:seed`を実行し、`development`環境の空の問題テーブルに同梱サンプルを取り込みます。

Composeはルートの`.env`を実行環境へ渡します。CLIを直接実行する場合は`.env`が自動で読み込まれないため、[環境変数の説明](architecture.md#ローカル環境と環境変数)に従って明示します。

DB接続は`DATABASE_URL`、又は`PGHOST`・`PGPORT`・`PGDATABASE`・`PGUSER`・`PGPASSWORD`を使用します。Composeでは`DB_HOST`・`DB_NAME`・`POSTGRES_USER`・`POSTGRES_PASSWORD`から接続します。秘密値は対象環境で設定し、`config/exam.json`へ書きません。

## 既存のRails版テンプレートから引き継ぐ

この手順は、このサービスの既存DBを更新するためのものです。別の資格試験を新しく始める場合は、新しいComposeプロジェクトと空のDBを使用します。

1. 更新前のコード・環境設定・SQLバックアップを保管し、別のDBへ復元して先に移行を確認する。未コミットの変更もバックアップに含める。
2. 試験設定と5問の問題データを保ち、`site.id=world-history-practice`、DB接続先、既存の`SECRET_KEY_BASE`を照合する。`.env`を例示ファイルで上書きしない。設定の変更や秘密値の更新は、DB移行と分けて実施する。
3. 旧構成のコードとComposeファイルがあるうちに、旧APIへの書き込みを停止する。旧構成のままで`docker compose stop backend`を実行し、購入・管理操作・Webhookの切替時刻も調整する。
4. 新しいコードとイメージを用意する。`COMPOSE_PROJECT_NAME=world-history-practice`、`postgres_data`ボリューム、`world_history_development`、DBユーザー`world_history`を維持する。画面3200・互換API3201・ホストDB55433も維持する。`docker compose down -v`は使用しない。
5. 新APIを起動する前に、対象DBへ一度マイグレーションを適用する。

```bash
docker compose build frontend
docker compose run --rm -e APP_ENV=production frontend npm run db:migrate
```

コンテナのENTRYPOINTは依存ロックファイルを確認するため、上記のように起動コマンドを指定した場合も、開発用の既存`node_modules`ボリュームを必要に応じて更新します。本番イメージでロックファイルが一致しない場合は停止し、イメージを再ビルドします。

6. `docker compose up -d --build --remove-orphans`で起動し、同一オリジンの`/api/v1/health`、ログイン、一般問題、管理画面、履歴・お気に入りを確認する。課金サービスでは販売を止めた状態からWebhook・購入履歴・利用資格も確認する。
7. 監査コマンドの結果を確認し、切り替えが完了してから販売等の運用を再開する。

```bash
docker compose exec frontend npm run operations -- operations:audit
```

同じ`SECRET_KEY_BASE`で署名された旧Railsのアクセス用トークンは、有効期限・用途・現在のユーザー権限を満たす場合に新APIで受け付けます。ログインCookie名は`site.id`から決まるため、識別子も維持します。

問題・選択肢を再作成せず、既存ID、ユーザー、bcryptパスワード、履歴、お気に入り、決済、会員資格、検証用資格を保持します。既存の外部キー・ユニーク制約・インデックスも維持します。旧Railsの管理用テーブルは残し、新たに`nitro_schema_migrations`へSQLの適用履歴と照合値を記録します。固定の20問・4択という旧上限制約が残るDBでは、正数の制約へ置き換え、設定に基づく件数の検査をAPI側で行います。

マイグレーションは単一トランザクションと専用ロックで適用し、失敗時は全体を取り消します。適用済みSQLの内容を変更すると照合値が一致せず停止します。変更は`frontend/server/database/migrations/`に新しい番号のファイルを追加します。CLIを標準配置以外で実行する場合のみ、`MIGRATIONS_DIR`でSQLディレクトリを明示してください。

移行後に問題JSONを再投入する必要はありません。既存問題があるDBへのimportは拒否します。新APIで書き込みを開始した後に旧APIへ戻す場合は、切り替え後のデータと決済イベントを照合し、単純なバックアップの巻き戻しで消失させないよう復旧手順を決めます。

## DB全体のバックアップ

問題アーカイブにはユーザー・履歴・購入情報を含みません。DB全体のバックアップはPostgreSQLの`pg_dump`で取得し、アプリの設定・秘密値も別の安全な場所に保管します。バックアップファイルは個人情報を含むため公開・Git管理しません。

次はローカルComposeの対象DBから取得する例です。出力先は未使用のファイル名にし、既存バックアップを上書きしないでください。

```bash
mkdir -p ../world-history-backups
chmod 700 ../world-history-backups
umask 077
docker compose exec -T db sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  > ../world-history-backups/before-nitro.dump
```

取得に成功したこと、ファイルが空でないこと、別DBへ復元できることを確認します。本番はホスティング先のバックアップ方針・保持期間に合わせ、復元先を明示して実施します。稼働中のDBへ直接復元する手順は用意していません。

## 問題だけのアーカイブ

```bash
docker compose exec -e OUTPUT=/tmp/questions-export.json frontend \
  npm run operations -- questions:export
docker compose cp frontend:/tmp/questions-export.json ./questions-export.json
```

形式は`format: "exam-practice-question-archive"`・`version: 1`で、問題・選択肢の件数と、キー順を正規化したJSONのSHA-256を含みます。旧Rails版の同形式のアーカイブも受け付けます。書き出し先の既存ファイルは上書きせず、コンテナ内のファイル権限は`0600`です。秘密の出題内容を含む場合は、回収後の保管先にも適切な権限を設定します。

空の問題DBへ取り込むときは、ファイルをコンテナへ置いて入力先を明示します。

```bash
docker compose cp ./questions-export.json frontend:/tmp/questions-import.json
docker compose exec -e INPUT=/tmp/questions-import.json \
  -e CONFIRM=IMPORT_INTO_EMPTY_DATABASE frontend \
  npm run operations -- questions:import
```

属性、表示ブロック、分類、番号、選択肢、正答数、出典、件数、照合値を検査します。問題又は選択肢が既存の場合や、公開セットが設定した問題数を満たさない場合は拒否し、途中まで保存しません。SHA-256は内容の破損・変更を検出するための値で、作成者を認証する電子署名ではありません。

## 復元演習

`operations:restore_drill`は実データをコピーせず、合成データだけでバックアップ・復元とサービスの読み取りを確認します。ローカルの`test`環境と、`db`・`localhost`・`127.0.0.1`・`::1`の接続先だけを許可します。販売と外部通知は無効にしてください。

```bash
docker compose exec -e APP_ENV=test -e DB_NAME=world_history_test \
  -e PAID_MEMBERSHIP_ENABLED=false -e ERROR_NOTIFICATIONS_ENABLED=false frontend \
  npm run operations -- operations:restore_drill
```

接続ユーザーには使い捨てDBの作成・削除権限が必要です。DBと同じメジャーバージョンの`pg_dump`・`pg_restore`を使用します。標準イメージはPostgreSQL 16用クライアントを含みます。

演習は毎回、新しいDBを2つ作り、片方にスキーマと合成の利用者・問題・履歴・お気に入り・決済・利用資格を作成します。バックアップをもう片方へ復元し、全行の件数と照合値、制約、インデックス、シーケンスを比較します。さらにパスワード照合、署名トークン、利用資格、回答前の正答非公開、履歴・お気に入り、管理者権限をTypeScriptサービスから確認します。外部Stripe通信やメール通知は行いません。

結果は件数・検査の成否だけを出力し、一時ファイルと作成したDBを削除します。実際のホスティング先のバックアップ復元や、切り替え後のHTTP・ブラウザ確認は別途実施してください。
