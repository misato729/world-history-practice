# AdSenseスクリプトの配信確認（2026-11-02）

ユーザーの明示依頼により、指定スクリプトを全ページ共通のheadへ追加した変更をコミット・pushし、CI・Netlify自動デプロイ・本番HTMLへの反映を確認する。Fly手動配信・DB変更は対象外。

## 送信前

frontend/nuxt.config.tsのapp.head.scriptへ、指定src（client=ca-pub-2745326644447602）・async・crossorigin=anonymousを追加。実Nuxt設定と導入済みUnheadでhead内1件/body内0件を確認し、独立レビューPASS。原資料のGit追跡/全履歴検査、テンプレート検査、git diff --check成功。

## 配信結果

コミット・push・CI・Netlify・本番確認は進行中。完了後に実測結果を追記する。広告の表示・Googleの審査結果はこの検証の対象外。
