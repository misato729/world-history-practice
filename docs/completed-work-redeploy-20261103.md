# 完了済み変更の再デプロイ（2026-11-03）

ユーザーの「再デプロイもしてください」により、既存の世界史・日本史のNetlify/Flyを再配信する。テンプレートは公開先なし、情報教認に今回の差分なし。対象mainは`b703b99a8f8f95905ca9b7ea222a426bd271f3ea`。直前に成功した[CI](https://github.com/misato729/world-history-practice/actions/runs/41576032017)の実装SHAからの差分は文書のみ。

Git追跡済みのfrontend/config/content/scripts等だけをクリーンに書き出し、資料保護検査を通す。Flyの既存env・注入ファイル・VM資源・販売設定を保持し、秘密値・原本・私用資料をbuild contextへ入れない。通常のmigration整合確認は既存release commandを維持し、新migration/seed/問題入替/利用者操作/実決済/メール操作は行わない。既存の別サービスや配信設定を変更しない。

NetlifyのPublished/SHA、Flyのimage/実ソース照合と公開health・販売設定、PC/SP画面を配信後に確認する。詳細な実行設定と秘密を含み得るログはローカル専用へ分離し、値は出力しない。

## 検査・再試行の記録

Fly deployは成功したが、CLIがrelease詳細stdoutを返さず最初の適用件数ログ検査は未達。再配信せず台帳のversion/sha256だけをVM内で比較し、10件と現ソースの全checksum一致を確認。世界史は事前台帳を取得していないため新規適用0の直接観測とは扱わない。

## 再配信・本番確認の結果

[Netlifyの公開記録](https://app.netlify.com/projects/world-history-practice/deploys/6ae96457ba0b03b0a58b2d7d)はPublished、対象SHAは`b703b99a8f8f95905ca9b7ea222a426bd271f3ea`。既存Git連携や自動公開設定を変更せず、最新mainを手動配信した。Flyのimageは`registry.fly.io/world-history-practice:completed-b703b99`。既存2VMのID・NRT配置・env・guest資源を保持し、双方で配信済みソースがHEAD blobのSHA-256と一致。公開healthは正常、販売設定は配信前と一致する。

世界史はWriter・入替処理・Checkoutの実ファイルを両VMで照合した。移行SQL10件のソースは旧稼働版と一致し、配信後の台帳も10件で全checksumが現ソースと一致。事前台帳は未取得なので、新規適用件数0をログ等で直接確認したとは扱わない。

匿名ホームのPC1280×900/SP390×844で模試6の開閉、会員案内への親子リンク、横方向のはみ出しなし、undefinedリンクなしを実操作し、4枚を目視確認した。実ログイン・解答送信・購入・メール送信の追加操作は行っていない。独立担当`premium_review`も最新SHAの公開、両2VMの反映と設定保持、再試行経緯・検証上の限界、4状態のDOM/画像を照合して最終PASS。

本番用のアプリソースは変更していない。更新したファイルは本記録・進捗・文脈カード・今回の不変引き継ぎだけ。配信元の固定SHAを維持するため、最後の記録コミットは`[skip netlify] [skip ci]`付きで送信する。原本・教材・秘密値はGit/Dockerへ追加せず、配信に使った一時configと採点ファイルの私用複製・生の設定控えは検証後に削除し、値を含まない結果と保護ログだけをローカル専用へ残す。

## 今回変更したファイル

- [docs/completed-work-redeploy-20261103.md](../docs/completed-work-redeploy-20261103.md) — 配信・本番検証記録。
- [docs/workflow/state.json](../docs/workflow/state.json) — 進捗・文脈又は評価/引き継ぎ記録。
- [docs/workflow/contexts/service.md](../docs/workflow/contexts/service.md) — 進捗・文脈又は評価/引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T04-33-41-979Z-r288.json](../docs/workflow/handoffs/2026-11-03T04-33-41-979Z-r288.json) — 進捗・文脈又は評価/引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T04-49-44-563Z-r289.json](../docs/workflow/handoffs/2026-11-03T04-49-44-563Z-r289.json) — 進捗・文脈又は評価/引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T04-55-50-645Z-r290.json](../docs/workflow/handoffs/2026-11-03T04-55-50-645Z-r290.json) — 進捗・文脈又は評価/引き継ぎ記録。
- [docs/workflow/handoffs/2026-11-03T04-55-52-691Z-r291.json](../docs/workflow/handoffs/2026-11-03T04-55-52-691Z-r291.json) — 進捗・文脈又は評価/引き継ぎ記録。
