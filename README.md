# 世界史ラボ（仮称）

歴検1級・難関大入試を目指す人のための世界史演習サービスです。情報教認ラボから抽出された汎用テンプレートを基に、独立したNuxt 4 / NitroのTypeScript API・PostgreSQL 16環境で動作します。画面とAPIは1つのNode.jsプロセスから配信します。サービス名は仮称です。

現在の通常ローカルDBには、自作大問「知識と情報の記録・伝達」を1題、全8小問（四択6問・語句記述2問）で収録しています。確認済みの用語集を根拠とし、公式過去問や本番1回分の模擬試験ではありません。

共通本文A・Bと7〜8小問を持つ単独大問、4大問・合計30問の教材を管理できます。追加教材用の番号枠は現在2枠です。旧5問は2026年10月27日の明示依頼により8問へ入れ替えました。[登録と確認](docs/question-registration-20261027.md)を参照してください。

既存サービスの利用者・回答履歴・認証情報・決済設定は持ち込んでいません。課金と販売は無効です。価格・決済手段・運営者情報・公開先は未確定です。

## できること

- ログインせずに問題を解き、回答後に正誤・正答・解説・出典を確認する
- 会員登録・ログイン、回答履歴の保存、お気に入りの登録
- 山川『世界史用語集』の19章・64節で問題を分類し、章節で絞り込んで演習する
- 全章を横断する文化史のみ・美術史のみの演習（章節との組合せにも対応）
- 管理者による教材・大問・共通本文・小問の作成、編集、構成検査と公開
- 文章・引用・穴埋め・表・プログラムと、共通本文の下線・空欄参照を含む問題の表示
- 正答1件の選択式と語句記述。短答の別名・異表記、文字種・字数条件の登録と採点
- 主分類に加えた関連章節、URLなしの書籍・Web資料の構造化出典
- 教材・大問・小問を含むv2アーカイブの書き出しと、v1／v2の空の問題領域への取込
- 任意で、一回払いの会員購入と有料問題の利用制限を有効にする

複数正答・論述採点・制限時間付きの受験セッション・試験全体の一括提出と採点は追加機能です。選択肢の件数とラベルは設定でき、選択式の正答は1件です。

## 作業範囲とローカル専用資料

エージェントの作業はこのリポジトリ内に限定します。`past-exam/`、`glossary.pdf`・`glossary*`、全文OCR等を含む `分析/` はローカル専用で、リモートへ送信しません。[配置と送信防止の手順](docs/local-only-materials.md)を参照してください。

新しいチェックアウトでは、push前に `git config --local core.hooksPath .githooks` を設定し、`node scripts/check-private-sources.mjs` を実行します。既存フックがある場合は上書きせず整合させます。

## 起動

DockerとDocker Composeを用意し、このリポジトリのルートで実行します。

```bash
# 新規セットアップ時のみ。既存の.envは上書きしない。
cp -n .env.example .env
docker compose up -d --build
```

`.env.example`はローカル開発用です。公開・共有環境ではDBパスワードと認証用の秘密値を独自の値に設定してください。

初回は依存関係の準備とSQLマイグレーションを実行します。開発環境で問題と選択肢が空の場合に限り、同梱の検証用サンプル5問を取り込みます。現在の実問題8問の同期元ではなく、復元には問題DBのバックアップ又は明示的なアーカイブ取込を使います。再起動や再度のseedで既存問題を上書きしません。本番では自動seedを実行しません。

既存のRails版から更新する場合は、起動前に[DB移行手順](docs/migration.md)を確認してください。問題・会員・回答履歴を再作成せずに引き継ぎます。

| 画面・接続先 | 初期値 |
| --- | --- |
| 学習画面 | http://localhost:3200 |
| 管理ログイン | http://localhost:3200/admin/login |
| 教材・大問の管理 | http://localhost:3200/admin/exams |
| 小問の管理 | http://localhost:3200/admin/questions |
| APIの稼働確認 | http://localhost:3200/api/v1/health |
| 旧APIポートとの互換接続 | http://localhost:3201/api/v1/health |
| 開発用PostgreSQL | localhost:55433 |

既存の開発環境と分離するため、Composeプロジェクト名・DB・ボリューム・ポートを独立させています。複数の派生サービスを同時に動かす場合は、各サービスの`.env`で`COMPOSE_PROJECT_NAME`を固有の値にし、公開ポート・接続URLを変更し、`config/exam.json`の`site.id`も異なる値にしてください。ログインCookieはこの識別子で分離します。

`frontend`（画面・API）と`db`の2サービスで動作します。3201も同じNuxtプロセスへの互換接続先です。Rubyと別のAPIサーバーは不要です。

Composeはルートの`.env`をコンテナへ渡します。Nuxt自身には`.env`読込がありますが、通常のNode.js運用CLIや`npm run db:migrate`等は自動では読み込みません。直接実行する場合は[環境変数の説明](docs/architecture.md#ローカル環境と環境変数)を参照してください。

停止には次のコマンドを使います。DBを残したまま停止します。

```bash
docker compose down
```

## 管理者を作る

既定の管理者や共通パスワードは用意していません。メールアドレスと名前を設定し、8文字以上・72バイト以内のパスワードを入力して作成します。

```bash
export ADMIN_EMAIL='admin@example.test'
export ADMIN_NAME='管理者'
printf '管理者パスワード: '
stty -echo
read -r ADMIN_PASSWORD
stty echo
printf '\n'
export ADMIN_PASSWORD
docker compose exec \
  -e ADMIN_EMAIL -e ADMIN_NAME -e ADMIN_PASSWORD frontend npm run admin:create
unset ADMIN_PASSWORD
```

同じメールアドレスが登録済みの場合は作成を拒否します。既存の一般ユーザーを自動で管理者へ変更しません。

## サービス設定と問題の追加

1. [`config/exam.json`](config/exam.json)で、サービスごとに一意な`site.id`と、試験名・ロゴ・配色・分類・教材番号の枠・構成・選択肢ラベルを設定する。従来5問の設定を30へ変えず、単独大問・模試の形式を使う。
2. 管理画面の「教材・大問」で、下書きの教材と共通本文を保存し、小問を作成する。本文参照・関連分類・回答形式・正答・解説・実際に確認した出典を設定する。
3. プレビュー・公開条件検査・再読込とPC／スマートフォン表示を確認し、完成した教材を公開する。既存DBの通常更新は管理画面・管理APIを使い、[`content/questions.json`](content/questions.json) は合成テスト・検証用サンプルとして扱う。
4. 利用規約・プライバシーポリシー・問い合わせ先を、そのサービスの実際の運用に合わせて仕上げる。

設定変更時の再起動方法、問題JSONの形式、既存DBがある場合の手順は、[カスタマイズ手順](docs/customization.md)を参照してください。設定変更と問題データの変更は別操作です。JSONファイルを編集しても、すでにDBに保存された問題は更新されません。

公開済みの実在小問と大問構成はAPIのカタログから取得し、順序を変えても既存URL用の通し番号を維持します。管理編集の競合と出題後の内容変更はバージョンで検知します。小問の内容変更はその小問、共通本文の変更は参照する小問だけの回答履歴を削除し、問題・選択肢IDとお気に入りを保持します。分類・表示順だけの変更では履歴を削除しません。

問題アーカイブは新規書き出しがv2、読込はv1／v2に対応します。利用者・履歴・お気に入り・決済を含まないため、DB全体のバックアップとは用途を分けます。操作は[API・DB・運用の概要](docs/architecture.md)を参照してください。

## 販売を始める場合

現在の`payments.enabled`は`false`です。価格は未定で、`payments.amount`の500円はテンプレートから残る未使用の初期値です。この状態では公開問題を全て無料で演習でき、ログインユーザーはお気に入りを利用できます。

`true`にすると、無料セットの範囲と会員の利用資格をAPI側で検査します。販売開始はさらに環境変数のフラグとStripe・販売者情報の設定で制御します。設定ファイルで課金機能を有効にするだけでは販売を開始しません。対応する購入方式は一回払いで、定期購読は含みません。[設定手順](docs/customization.md#課金を有効にする)を確認してください。

## 検証と構成

設定と初期問題の検査は、Node.jsで実行できます。

```bash
node scripts/check-template.mjs
```

Node.jsは`frontend/package.json`の対応バージョンを使用します。DockerはNode.js 24を使用します。APIと画面のテストはTypeScriptです。APIには開発用と別の`world_history_test`を明示し、次のコマンドで実行します。

```bash
# 初回のみ、独立したテストDBを作成する。
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" world_history_test'
docker compose exec -e APP_ENV=test -e DB_NAME=world_history_test frontend \
  sh -c 'npm run db:migrate && npm run test:server'
docker compose run --rm frontend \
  sh -c 'npm test && npm run typecheck && npm run build'
```

- [進捗管理・セッション引き継ぎ](docs/workflow/README.md)
- 分類・文化史・美術史の運用：`docs/classification.md`（ローカル専用。リポジトリの配布対象外）
- [カスタマイズ手順](docs/customization.md)
- [API・DB・運用の概要](docs/architecture.md)
- [Rails版からの移行・バックアップ・復元演習](docs/migration.md)
- [検証結果と依存関係の確認事項](docs/verification.md)
- [依存ライブラリの修正と監査表示](docs/dependency-security.md)
- [サンプル問題について](content/README.md)

このサービスはテンプレート元と独立して管理します。テンプレート側の更新は自動反映されないため、採用する修正を確認して各サービスへ取り込んでください。

## 今後追加する機能

- 論述の入力と、解答例・採点要点の表示
- 制限時間付きの受験セッション、一括提出、試験全体の採点
- 問題の拡充と、近年の過去問との出題傾向の照合
- 高校生本人・保護者が利用しやすい決済の選定

これらは現在の実装には含みません。用語集PDFや公式過去問PDFそのものは公開ファイルとして収録していません。
