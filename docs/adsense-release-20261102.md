# AdSenseスクリプトの配信確認（2026-11-02）

ユーザーの明示依頼により、指定スクリプトを全ページ共通のheadへ追加した変更をコミット・pushし、CI・Netlify自動デプロイ・本番HTMLへの反映を確認する。Fly手動配信・DB変更は対象外。

## 送信前

frontend/nuxt.config.tsのapp.head.scriptへ、指定src（client=ca-pub-2745326644447602）・async・crossorigin=anonymousを追加。実Nuxt設定と導入済みUnheadでhead内1件/body内0件を確認し、独立レビューPASS。原資料のGit追跡/全履歴検査、テンプレート検査、git diff --check成功。

## 配信結果

コミット・push・CI・Netlify・本番確認は進行中。完了後に実測結果を追記する。広告の表示・Googleの審査結果はこの検証の対象外。

## 初回配信と追加修正

83cd472a0b06530c6e6d998291ae74dbb0032e40をmainへpush。CI41423228799のharness/verify全工程success。Netlify管理画面で自動公開ON、同SHAのPublishedとデプロイ6ae85baed79ba7e4232e6f47（26秒）を確認。

本番HTML7URLでhead内の指定script1件・async・crossoriginを確認。トップ/login/privacy-policy/terms/admin/questions/reset-passwordはHTTP200。practice/1/1/はHTTP404だがHTMLにタグあり、実ブラウザでは演習フォームが表示された。旧配信の比較URLは401で、404の発生時期は未確認。

追加の実ブラウザDOM確認で、初期scriptにdata-checked-head属性が付き、クライアント処理後に同じsrcが2件になるケースを検出。Unheadの既存DOM照合が属性の変化で一致しないことを避けるため、共通scriptに安定したkey=google-adsenseを指定。初回配信の検査を最終合格にせず、修正後にCI/自動配信/HTML/読み込み後DOMを再検証する。
