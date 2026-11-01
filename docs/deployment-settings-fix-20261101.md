# Fly/Docker設定の修正・検証（2026-11-01）

ユーザー「では適切な設定に修正してください」に基づくローカル修正。開始HEADはc2e2220。開始時に未コミットだったREADME.md、docs/architecture.md、docs/workflow/contexts/service.md、docs/manual-change-audit-20261101.mdは前の点検作業の差分として保持し、本作業の追補を区別する。本番・通常DB・既存コンテナを変更せず、コミット・push・デプロイは今回行わない。

## 変更

- frontend/fly.toml：ルートcontextに対してfrontend/Dockerfileを指定。BETTER_AUTH_URL/NUXT_API_ONLYを削除。メモリは1gbのみ。NRT、CORSの世界史URL、最小0台、自動停止、releaseでのmigrationを維持。
- frontend/Dockerfile：開発targetを保持。本番はクリーンなNode24 Alpineから組み立て、USER nodeで起動。npm prune --omit=devと安全パッチ確認後の依存・lock marker、server/shared、config/content、entrypoint/guard/patchのみをコピー。compiled .outputを保持。DB運用のPostgreSQL16 clientは残す。元アプリの認証方式・APIを変更せず、通常Nitroを使う。
- .github/workflows/ci.yml：既存の開発イメージによるAPI・画面・型・buildの後、本番イメージをビルドし、ネットワークなしで非root/CLI import/安全パッチ/開発ソースと開発専用依存（@types/pg・@iconify-json/lucide）の不在を確認。
- README.md/architecture：ルートからのビルド・承認後の配信手順を明示。手動変更点検には本記録へのリンクを追記。

production依存にはNuxt/UI/Tailwind等が現行package.json上残る。これはnpmのproduction依存のみという意味であり、API用の完全最小パッケージ集合やAPI専用サーバー化を意味しない。将来これらまで除去する場合はCLIの依存閉包・パッチ方式と別途整合させる。

## 検証

Fly TOMLをtomllibで解析し、Dockerfileの実在・internal_portとNITRO_PORTの一致・未使用変数の不在・メモリ指定の一本化を確認：成功。

開始時に本番/開発build・隔離DBでの起動/CLI・独立レビューを計画し、以下に実行結果を追記した。

## 参照

Fly公式の[モノレポ配信](https://fly.io/docs/launch/monorepo/)はビルドcontextを作業ディレクトリとし、config/Dockerfileのパスもそこから解決する。今回は公式ドキュメントの検索結果と、実Dockerビルドでパスを照合する。

独立レビューで、TypeScriptはNuxt/UIのproduction側の依存でもあり、prune後の不在を要求できない点を確認。CIではlock上dev:trueの2パッケージだけを検査するよう実行前に修正した。

### 初回の検証評価

本番イメージbuild・CI追加step・非root/CLI/パッチ検査、隔離DBの7 migration→再実行0、health200/exams200/admin401/CORS204・operations:auditは成功。最後のseed検査は、スクリプトが非ゼロ終了を期待したため失敗。実装はproductionでstatus:skippedを返す仕様であり、アプリの不具合ではない。検証スクリプトだけを修正し、別の新規_test DBで再実行する。初回に作成した2コンテナ・専用ネットワークはすべて削除成功。

### 再評価で確認した結果

- Docker production build成功（Nuxt/Nitroの全ビルドを含む）。CIに追加したrunブロックを抽出し、シェル構文確認後にそのままローカル実行して成功。Fly TOMLのパスとtargetを実際に読み込んでビルドできた。
- 本番イメージは非root、読み取り専用root filesystemでもCLI importと安全パッチ確認に成功。app/tests/gitと開発専用2パッケージは不在。PostgreSQL clientを確認。
- 新規の専用internalネットワーク＋PostgreSQL16の空DB（名称末尾_test）のみを使用。productionモードのdb:migrateで7件適用、再実行は0件。
- 同イメージのproductionモードでhealth 200、exams 200、匿名admin/questions 401、許可originのCORS preflight 204を確認。
- operations:audit成功。本番モードのdb:seedはstatus:skipped。前後ともquestions 0件を保持。
- 再評価はすべて成功。専用アプリ/DBコンテナ2件とネットワークは削除成功。通常の世界史/日本史コンテナと通常DB、本番は変更していない。
- settings_reviewによる独立最終レビュー：未解決のブロッカーなし。TypeScriptの誤った不在検査は修正済み。
- 設定/サンプル検査、原資料の全Git履歴検査、差分とworkflow形式/依存/根拠検査も成功。

Fly CLIのconfig validateは隔離した設定ディレクトリでは認証がなく未実施。代わりにTOMLの静的解析と、そこから取り出したパス/targetによる実Dockerビルドを確認した。Fly/Netlifyの本番適用、通常DBの操作、GitHub Actionsでの実行、コミット・pushは行っていない。

作業中にfrontend/app/components/EssayScoringResult.vueの模範解答の表示位置を変える並行差分を検出。本作業では編集・取消しをしていない。設定修正の検証と、そのUI差分の検証・納品を混同しない。

開発targetのDocker buildも成功。生成したイメージのCMDを実際に取得してdb:migrate→dev・自動seedなしを確認し、ネットワークなしでCLI importと安全パッチ確認に成功した。既存の起動中Composeコンテナの再作成・停止はしていない。

## 設定・資料のGit納品（追加依頼）

2026-11-01の追加依頼で設定修正と手動変更の点検資料をcommit/pushし、CI完了まで確認する。開始HEAD704f5b7はfetch後のorigin/mainと一致（0/0）。このUI表示順変更は既に別コミットで送信済みで、今回の新規変更に含めない。Netlify管理画面でBuilds are stoppedを読取確認し、設定未変更。skip netlifyを使用し、デプロイは行わない。原資料保護とdiff checkは成功。送信・CIの結果は確認後に追記する。

送信前settings_reviewでstage12ファイルを独立確認：設定3ファイルと関連文書/workflowだけ、原資料/秘密/UIファイルなし、diff check成功、未解決の指摘なし。

### 送信とCIの確認結果

設定・資料12ファイルを76295aeef711ab3142ad53335d4b0de03f72454aでmainへ通常push。保護hook成功、送信直後origin/mainとの差分0/0、未コミット変更なし。GitHub Actions [41259876358](https://github.com/misato729/world-history-practice/actions/runs/41259876358) は対象SHAでharness（8秒）/verify（2分4秒）が成功。DB/API、フロントのテスト/型/build、新設の非rootproduction image build/検査と後片付けまで全step成功。既存actionsのNode20廃止とubuntu-latest移行に関する通知は警告であり、今回の失敗ではない。

この完了記録とworkflow状態を文書のみの追送コミットにまとめる。その最終SHAのCIは追送後に確認する。コード・本番・通常DBへの追加変更は行わない。
