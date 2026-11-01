# 手動コミットの追補と設定点検（2026年11月1日）

## 対象と確認範囲

ユーザー依頼「利用枠がない間に私がファイルを操作したので、コミット履歴からその分をドキュメントに残す」に基づく追補。作業開始時のHEADは `c2e2220`、作業ツリーはclean。主対象は2026年10月31日の `3a8681e` から `a029f82` までのFly/Docker変更8件と引き継ぎ保存1件。著者欄だけでは手動操作・別チャット・実行者を区別できないため、操作意図は断定せずGit差分を記録する。時刻はJST。

Gitはファイルの履歴であり、デプロイ成功・稼働中イメージ・DB移行・管理画面の設定変更を証明しない。今回、本番設定やDBは変更せず、秘密情報も読み出していない。

## 時系列

| 日時（2026-10-31） | コミット | 対象 | 差分で確認できた内容 |
| --- | --- | --- | --- |
| 12:02 | `3a8681e` | `frontend/fly.toml` 新規 | Dockerfile、release時のDBマイグレーション、3000番ポート、HTTPSを指定。初期FRONTEND_URL/CORSはFly側URL。 |
| 12:20 | `c41e1a9` | 同上 | FRONTEND_URL/CORSのenv節を削除。引用符変更も含む。 |
| 12:24 | `ce795d2` | `frontend/Dockerfile` | 手元のコンテキストからのCOPY方式を、世界史リポジトリの固定SHAをGit ADDで取得する方式へ変更。build/production分割、依存prune、USER nodeを導入。developmentターゲットはこの時点でなくなる。 |
| 12:45 | `c1d0d51` | `frontend/fly.toml` | FRONTEND_URL/CORSをNetlifyの世界史URLとして再設定。 |
| 19:00 | `7f3be67` | `docs/workflow/handoffs/*.json` 4件 | 既存世代185/186/188/189の引き継ぎをコミット。新しい配信設定の追加ではない。 |
| 19:25 | `26711fe` | `frontend/Dockerfile` | ローカルCOPY方式のdevelopmentを復活。build用Git ADDの参照先が **日本史リポジトリ** の固定SHAへ変更される。開発起動時の自動seedはなくなる。 |
| 19:51 | `2f4c908` | `frontend/fly.toml` | app名/NRT/productionターゲット、環境、health check、自動起動停止、最小0台、shared 1CPU/1GBを明示。Dockerfileのパスはfrontend/Dockerfile。 |
| 19:58 | `e2ded4d` | `frontend/Dockerfile` | Git ADD/固定SHA方式を廃止し、全ターゲットをローカルCOPY方式へ統一。base/development/build/production構成。OpenSSL/pg client/gitとメモリ・並列数制限、root scriptsのCOPYを追加。productionはbaseを継承し、USER node指定はなくなる。 |
| 20:09 | `a029f82` | `frontend/fly.toml` | dockerfileの値をfrontend/DockerfileからDockerfileへ変更。 |

これより前の `303c3db` は費用資料・architectureへのリンク・workflow記録の追加で、Fly配信設定の変更ではない。

## 後続作業との境界

- `67333ae`（11月1日09:10）：公開APIのSQL削減と本番移行・速度調査の記録。手動Fly/Docker変更とは別。実行結果は [本番移行](production-migration-20261031.md)、[速度改善](performance-improvement-20261101.md) を参照。既存記録では最終NRT2台、Neon Singapore。今回の再計測ではない。
- `0c7c296`：利用規約/プライバシーポリシーの無料サービス向け変更と問い合わせ先設定。
- `c2e2220`：旧草案文言を必須にするテストを修正。CI [41257200723](https://github.com/misato729/world-history-practice/actions/runs/41257200723) は前の作業でharness/verify成功を確認済み。今回再実行してはいない。
- Netlifyのビルド停止は前の送信作業で管理画面の「Builds are stopped」を確認。今回変更・デプロイしていない。

## 点検結果

### 1. 要注意：過去に日本史のソースを取得する設定があった（現在は除去済み）

`26711fe` のbuildターゲットは japanese-history-practiceを取得するため、当時このターゲットで本番ビルドを行えば世界史とは異なるコードが入る設定だった。`e2ded4d` でGit ADD全体が削除され、現在のDockerfileにこの参照はない。現在も混入していると断定しない。当時の稼働イメージの中身はGitだけでは未確認。

### 2. 要確認：FlyのDockerfileパスとビルドコンテキスト

現在のfly.tomlはfrontend配下で `dockerfile = "Dockerfile"`。DockerfileのCOPYは `frontend/`・`config/`・`content/`・`scripts/` を要求するため、コンテキストはリポジトリルートである必要がある。frontendだけをコンテキストにすると兄弟ディレクトリが取得できず、ルートでDockerfileという名前だけを指定すると実ファイルがない。Composeはルートcontext＋frontend/Dockerfileを明示しており、この問題はない。

Flyの設定ファイルがある場所とビルドコンテキストを同一視せず、次の配信前に実際のCLI/管理画面の作業ディレクトリ・Dockerfile指定を固定して検証する。今回はデプロイを行わず、既存配信が必ず失敗するとは断定しない。

### 3. 改善候補：未使用の環境変数

- `BETTER_AUTH_URL`：現在のアプリソースに参照がなく、認証実装はpgを使う既存方式。Better Authへ移行した証拠にはならない。
- `NUXT_API_ONLY`：Dockerfileとfly.tomlで定義するだけで、現在のnuxt.config.ts・アプリ側に分岐がない。これをtrueにしてもAPI専用ビルドになる実装は確認できない。APIのみを配信したいなら実装と出力の確認が必要。

### 4. 改善候補：本番イメージの権限と大きさ

productionがbaseを継承するため、開発依存・ソース・git等が残り、USER指定もない（ベースのrootで動く構成）。起動不良そのものとは限らないが、本番最小構成と非root実行を検討できる。CLI・マイグレーション・entrypointの依存整合検査が必要なので今回は変更しない。

### 5. 仕様上のトレードオフ・重複

- `min_machines_running = 0` と自動停止：費用を抑える一方、停止後の初回アクセスで起動待ちがある。意図した構成なら誤設定ではない。既存の速度記録と区別して扱う。
- `memory = "1gb"` と `memory_mb = 1024` は同容量の二重指定。値の矛盾はないが、将来片方だけ直すと紛らわしい。
- CORSは世界史のNetlify originに限定、内部ポート3000とNITRO_PORTは一致、release時にDBマイグレーションする構成は整合している。

### 6. 設定ではなく資料の古さ

README/architectureに「起動時に空DBへ自動seed」「実問題8問」「公開先未定」といった移行前の説明が残る。現Dockerfileの開発CMDはdb:migrateとdevのみで、自動seedは起動しない。db:seedコマンド自体は残っている。この違いを追補し、現在の配信構成をarchitectureの冒頭へ反映した。

## 今回の確認と未確認

git log/show/diff、Dockerfile・fly.toml・Compose・entrypoint・Nuxt設定・環境変数の参照箇所を静的照合。コミット参照・資料リンク検査、git diff --check、node scripts/context.mjs checkは成功。Docker再ビルド、本番へのアクセス・設定/イメージ取得、DBの内容/秘密の検査は行っていない。Git履歴にないNetlifyのビルドコマンドや環境変数は確認対象外。

今回の依頼は記録・点検であり、実行設定・アプリ・DBの変更、コミット・push・デプロイは行わない。

## 後続の設定修正

点検後のユーザー依頼に基づくローカル修正は[Fly/Docker設定の修正・検証](deployment-settings-fix-20261101.md)を参照。上記の履歴は修正前の点検記録として保持し、本番適用済みとは扱わない。
