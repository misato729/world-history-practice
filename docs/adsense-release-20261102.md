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

## 修正版の本番確認

修正9015f70bdf5dad38d6af3981753d54f2bbec0257をmainへpush。Netlify管理画面で自動公開ON、Published main @9015f70、デプロイ6ae85cfceaba11e4b07496b7（28秒）を確認。手動デプロイは実行していない。

実Chromeでpractice/1/1/を読み込み、radioフォームの表示後にdocument.headを検査。指定src・async・crossorigin=anonymous・data-hid=google-adsenseのscriptが1件。プライバシーポリシーへのアプリ内遷移後も1件を維持。フォーム表示までの確認であり、回答送信・採点等は今回の検証対象外。

HTTP404は直接要求のステータスとして残るが、演習画面はブラウザで描画された。404の修正・旧配信との因果特定は依頼範囲外で未実施。広告表示・Google審査も未確認。プライバシーポリシーの広告Cookie未使用の記述はそのままであり、今回のscript追加に合わせた本文改定は行っていない。

修正版CI41423971355はharness/verify全工程success。gh run watch --exit-statusは0。公開head・実DOM・内部遷移の検証結果と合わせ、修正版を評価する。

## 検証URLと変更ファイル

- CI: https://github.com/misato729/world-history-practice/actions/runs/41423971355
- Netlify: https://app.netlify.com/projects/world-history-practice/deploys/6ae85cfceaba11e4b07496b7
- 本番: https://world-history-practice.netlify.app/

変更: frontend/nuxt.config.ts、docs/adsense-release-20261102.md、docs/workflow/contexts/service.md、docs/workflow/state.json。引き継ぎ記録はr230/r231（実装）、r232（初回配信評価の失敗）、r233/r234（修正版の合格評価と完了）を追加。

完了記録の追送は文書のみ・skip netlify指定とし、検証済みの機能配信SHA9015f70を維持する。Fly手動配信・DB・Google側設定・広告表示/審査は変更していない。

独立最終レビューadsense_reviewは修正版差分・最終HTML7件・CI全工程を確認してPASS。読み込み後/内部遷移後DOMとNetlify管理画面は親担当の実確認を根拠とする。
