# 模試4・5と6・7の入れ替え（2026年11月2日）

ユーザーの明示依頼により、ローカルと本番の両DBで旧6→4・旧7→5・旧4→6・旧5→7へ入れ替えた。両環境とも変更前から7セット210問すべて公開であり、公開数を維持した。過去の「ローカル6・7は下書き」という記録は今回の現在値には適用していない。

各環境120問・16大問の所属番号だけを共通Writerの原子的処理で変更。問題・大問・本文・選択肢・参照のID、問題内容・正答・論述採点設定・内容版・作成日時を保持し、編集競合検出のlock_versionと更新日時だけを更新した。模擬試験番号を含む論述プロファイルの内部IDは安定した参照なので改名していない。模試1〜3とセット数・料金設定も変更していない。

本番の回答履歴3件・お気に入り1件、ローカルの各0件をそのまま保持。変更対象の3表以外はローカル14表・本番15表について件数と全行の照合値が一致し、対象3表も内容全体の照合値・対象外行・変更予定メタデータの厳密比較に合格した。本番だけに存在するpassword_reset_tokensが表数差の理由である。個人情報や回答本文を検査ログに取り出さず、照合値はDB内部で算出した。

スキーマ、既存の制約・トリガー・採番は変更していない。一意制約を避ける一時番号と、外部キーの両側を同じSQL文で移す方法を使った。処理全体はトランザクションと既存共通の書込ロックで保護する。変更前の内容照合値が異なる操作は拒否し、同じ操作の再送による逆入れ替えも防ぐ。既存トリガーによるセッション解答の消去を避けるため、対象に有効・完了済み試験セッションがあれば変更前に拒否する。今回の対象セッションは両環境0件であり、試験セッションの削除・失効は発生していない。

## 確認結果

- 隔離した合成DBの焦点化テスト6件成功、失敗・スキップ0。外部キーと一意制約を維持した2組の入れ替え、ID・内容・履歴・お気に入り保持、途中失敗の全取り消し、不正な組・古い照合値の拒否、完了セッション保護、全件公開状態と対象外セッション保持を確認した。
- 追加した処理とテストのTypeScript検査は診断0。初回はテストデータの必須属性不足を検出し、補完後の型検査と6件のテストを再実行して成功した。Nuxt全体の型検査・ビルドは今回実行していない。pgの既存大問ローダーに由来する単一接続上の並行問い合わせの非推奨警告は残るが、テスト失敗はない。
- 両DBで変更直後と確定後の別接続から全7セットの公開構成、指定した番号対応、内容・対象外・履歴等の保持を確認した。同じ変更前照合値での再操作は拒否された。
- 本番の実HTTPで公開一覧7セット210問、入れ替えた全16大問の先頭問題のID・番号・大問を照合し、回答前の正答・解説・出典・採点設定の非公開も確認した。Netlifyの公開ページはHTTP200で、確認したFly APIへの接続先を保持している。HTTP確認UTCは2026-11-02T11:27:40.631Z。ブラウザ画面の手動操作は今回実施していない。
- 独立担当swap_reviewがソース・合成テスト・前後照合・確定後再読込の根拠を確認し、阻害事項なしと評価した。
- この作業専用の合成テストDBは検証後に削除した。通常DBは保持。ローカルDBの起動にDockerを起動した。実問題のseed・import・原資料送信は行っていない。

DB変更で反映できるため、アプリのデプロイは行っていない。コミット・pushも今回の依頼範囲に含まれず未実施。作業開始前の広告関連の文書・進捗差分は上書きせず保持した。

## 変更ファイル

- `frontend/server/services/learning-set-swap.ts`：照合値付きの原子的入れ替え、対象セッション保護、公開枠維持、構成検査。
- `frontend/server/services/learning-writer.ts`：共通Writerから上記処理を公開。
- `frontend/server-tests/exam-set-swap.test.ts`：合成データによる6件の安全性検証。
- `docs/mock-set-swap-20261102.md`：本記録。
- `docs/verification.md`：今回の検証結果への参照。
- `docs/workflow/contexts/service.md`：現在の番号対応と作業完了記録。
- `docs/workflow/state.json`：今回のタスクだけを追加・更新。既存タスクを保持。
- `docs/workflow/handoffs/2026-11-02T11-16-52-326Z-r239.json`：開始の不変記録。
- `docs/workflow/handoffs/2026-11-02T11-30-20-190Z-r240.json`：合格評価の不変記録。完了時にも新しい不変記録を生成する。

ローカル専用の操作スクリプト・照合値・検証根拠は`local-only/mock-set-swap-20261102/`へ保持し、Git送信対象外とする。問題内容や個人情報の復元用コピーを外部へ送信していない。

### ローカル専用ファイル一覧

- `local-only/mock-set-swap-20261102/http-check.json`
- `local-only/mock-set-swap-20261102/http-check.mjs`
- `local-only/mock-set-swap-20261102/launch.mjs`
- `local-only/mock-set-swap-20261102/local-after.json`
- `local-only/mock-set-swap-20261102/local-apply.log`
- `local-only/mock-set-swap-20261102/local-before.json`
- `local-only/mock-set-swap-20261102/local-inspect.log`
- `local-only/mock-set-swap-20261102/local-readback.json`
- `local-only/mock-set-swap-20261102/local-result.json`
- `local-only/mock-set-swap-20261102/local-verify.log`
- `local-only/mock-set-swap-20261102/plan.md`
- `local-only/mock-set-swap-20261102/production-after.json`
- `local-only/mock-set-swap-20261102/production-apply.log`
- `local-only/mock-set-swap-20261102/production-before.json`
- `local-only/mock-set-swap-20261102/production-inspect.log`
- `local-only/mock-set-swap-20261102/production-readback.json`
- `local-only/mock-set-swap-20261102/production-result.json`
- `local-only/mock-set-swap-20261102/production-verify.log`
- `local-only/mock-set-swap-20261102/review.md`
- `local-only/mock-set-swap-20261102/run.ts`
- `local-only/mock-set-swap-20261102/test-tests.log`
- `local-only/mock-set-swap-20261102/tests.log`
- `local-only/mock-set-swap-20261102/typecheck.json`
