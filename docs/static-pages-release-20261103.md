# 静的ページAPI修正の配信（2026-11-03）

ユーザーが世界史・日本史の今回の修正についてコミット・push・本番反映を承認。元の実装/検証は [静的ページ修正記録](static-pages-catalog-20261103.md)。本記録は配信段階の現在地を追記する。

## 送信範囲と保全

サイドバー、合成回帰テスト、静的ページ用AGENTSルール1行、今回の検証記録・進捗・引き継ぎだけを送信する。共有AGENTS/文脈カード/世界史stateはHEADの内容に今回分だけを加えたindexを作り、手元の別作業の差分は変更しない。世界史の作問・入替・Writer関連、日本史のproduct関連は送信に含めない。

両NetlifyのGit接続先が各リポジトリ、main自動公開がonであることを配信前に確認。今回は明示された本番反映を伴うため機能コミットにskip netlifyを付けない。フロントエンドだけの変更で、Fly・DB・Stripe・環境変数・販売設定は変更しない。

CIと同SHAの公開、公開バンドル、実画面の確認は実施後に追記する。公開前の状態を成功としない。

## 配信と本番確認

機能コミット `7cde4ff1d43f8cbc965f61ac00db038c4ebf44c0` を各mainへpushし、送信直後のローカル/リモート差分は0/0。Netlifyの自動配信で [同SHAのPublished](https://app.netlify.com/projects/world-history-practice/deploys/6ae90c6e4a8d8cd6aed8642c) を確認した。手動再配信やホスト設定の変更は行っていない。

[今回のCI](https://github.com/misato729/world-history-practice/actions/runs/41536267111)は全成功。harness/verify をすべて確認した。

本番HTTPでプライバシー/規約/特商法/試験概要/ログイン/会員登録/再設定案内/再設定入力/プレミアム案内/完了の10ルートがすべて200。公開HTMLから実際の依存JSを辿り、[共有サイドバーの公開JS](https://world-history-practice.netlify.app/_nuxt/-3rJ9mVs.js) が実ソースと同じ取得条件を含むことを照合した。SHA256は `67123915fb7fbe596cffc2bb641048e06cbdb347d1103e3ba93b3ab1c8de6829`。演習パス又はトップかつ資格確認済み、という条件が含まれ、静的一覧/開始ページリンク/有料ロックも保持している。検索エンジン用の類似したルート条件とは区別して確認した。

本番ブラウザーでは匿名のポリシー直アクセス、規約への内部遷移、PC1440×1000/SP390×844、模試一覧の開閉、無料開始リンクと6以降の `/premium` リンク、横はみ出しなしを確認し、スクリーンショットを目視した。実利用者のログインを変えず、合成会員での課金や購入操作も行っていない。公開JSの条件/同SHA配信/実画面を確認した結果であり、本番のブラウザー通信履歴を採取してAPI0件を直接計数したものではない。0件の計測・資格後の通信順・遅延応答取消は前段の実Nuxt+合成APIと回帰で確認した。

本番UIの一時控えは `/tmp/static-release-world-pc-20261103.png` と `/tmp/static-release-world-sp-20261103.png`。公開JS照合の控えは `/tmp/static-release-public-evidence-20261103.json`。Pythonのローカル証明書ストア不足で初回HTTP確認が止まったため、証明書検証を維持するOSのcurlへ切り替えて確認を完了した。これらは本番障害ではない。

既存作業の保全：送信前に記録したAGENTS/文脈/別作業のソース等の全照合値が送信後も一致。別作業の作業ファイルは一度も上書き/取消していない。

## 今回の変更ファイル（各リポジトリ内の実パス）

- [AGENTS.md](../AGENTS.md)
- [frontend/app/components/ExamSidebar.vue](../frontend/app/components/ExamSidebar.vue)
- [frontend/tests/sidebarCatalogAccess.test.ts](../frontend/tests/sidebarCatalogAccess.test.ts)
- [docs/static-pages-catalog-20261103.md](../docs/static-pages-catalog-20261103.md)
- [docs/static-pages-release-20261103.md](../docs/static-pages-release-20261103.md)
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md)
- [docs/workflow/state.json](../docs/workflow/state.json)
- [docs/workflow/handoffs/2026-11-02T22-11-50-635Z-r267.json](../docs/workflow/handoffs/2026-11-02T22-11-50-635Z-r267.json)
- [docs/workflow/handoffs/2026-11-02T22-12-22-876Z-r268.json](../docs/workflow/handoffs/2026-11-02T22-12-22-876Z-r268.json)
- [docs/workflow/handoffs/2026-11-02T22-18-15-836Z-r269.json](../docs/workflow/handoffs/2026-11-02T22-18-15-836Z-r269.json)

## 最終評価

独立担当 `/root/premium_review` が両CIを再照会し、公開JSを再取得してハッシュ/条件の完全一致を確認。PC/SP4画像の目視、元dirtyのWorld8件/日本史5件の照合値も独立計算してPASS。配信記録だけを `[skip netlify] [skip ci]` 付きで追送し、検証済みの機能配信とCIを維持する。文書コミットのCIを新たに実行済みと扱わず、機能SHAのCI成功と区別する。

今回の機能変更は本番反映済み。共有の別作業差分は送信せず手元に保持し、採点・問題DB・利用者データ・販売設定・Flyの稼働imageは変更しない。

完了時に追加した引き継ぎ：

- [docs/workflow/handoffs/2026-11-02T22-27-02-840Z-r270.json](../docs/workflow/handoffs/2026-11-02T22-27-02-840Z-r270.json)
- [docs/workflow/handoffs/2026-11-02T22-27-04-340Z-r271.json](../docs/workflow/handoffs/2026-11-02T22-27-04-340Z-r271.json)
