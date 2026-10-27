# 大問・共通本文・語句記述の実装完了記録

確認日: 2026年10月27日（UTC）。[承認済み設計](grouped-question-design-20261027.md)に基づく機能実装とローカル検証の記録である。コミット・push・デプロイ・本番確認は、この実装作業では行っていない。

## 記録の時点と後続登録

この記録の通常DB保全結果は、005・006の構造移行と最終実装検証が完了した時点、すなわち後続の「旧5問から新しい8問への登録」作業に入る前の結果を示す。その時点では旧5問・20選択肢を保持し、機能検証のための実問題再投入は行っていない。

その後、ユーザーから新しい問題登録の指示を受け、親担当が別タスクで進めている。以下の保全結果を登録後の現在件数へ読み替えず、後続登録の完了・照合・公開状態は当該タスクの記録で確認する。この文書は登録前の問題本文や新しい草案を転載せず、登録が未実施・実施済みであることも現時点の状態として断定しない。

## 実装した機能

- 教材・大問・小問を分け、従来教材、1大問7問又は8問、4大問・合計30問を教材別に検査する。大問テーマで時代・地域を限定せず、小問・選択肢ごとに横断できる。
- 共通本文A・B、段落・表、下線・空欄を構造化し、本文全体又は安定したIDへ小問から参照する。別大問への参照や参照切れは拒否する。
- 選択式正答1件と語句記述を混在させる。語句記述は先頭の模範解答と許容表記、文字種・字数条件を持ち、NFKCと前後空白除去で照合する。曖昧一致は行わない。
- 主分類と複数の関連章節を持ち、同じ分類リンク内の章節一致と文化史条件をANDで照合する。書籍はURL任意、WebはHTTPS必須の構造化出典を保存する。
- 管理の編集バージョンと出題内容バージョンを分け、競合編集・古い回答を409で拒否する。ログイン回答の同一送信キーは同じ結果を返し、履歴の重複を防ぐ。
- 内容・共通本文の変更は依存する小問の履歴削除と内容バージョン更新を同じトランザクションで行う。同一内容・分類・配置だけの変更は履歴を保持し、問題・選択肢ID、URL用番号、お気に入りと対象外データを保持する。
- 親教材・大問・小問の公開状態と利用資格をAPI側で検査し、回答前の正答・模範解答・許容表記・解説・出典を返さない。未公開兄弟の削除で別の公開大問を止めない。
- 新規アーカイブはv2とし、v1読込を維持する。大問・本文の輸送IDをDB IDへ写像し、既存の問題領域への取込を拒否する。利用者・履歴等を含むDB全体バックアップとは区別する。

005は既存テーブル・IDを保持したまま構造を追加した。006は公開時に回答形式を永続固定し、下書きへ戻してから形式を変更する迂回も拒否する。006の移行時点で公開中の問題だけを固定対象に補い、既存draft/privateの過去の公開実績は推測しない。この固定状態の完全な保存にはDBバックアップを用いる。コンテンツアーカイブは過去の公開履歴を持ち運ばない。

## 最終検証

| 対象 | 結果と確認範囲 |
| --- | --- |
| サーバー・DB・運用 | 82件成功、失敗・スキップ0。公開、認可、採点、参照、履歴影響、移行、アーカイブ、既存決済等の回帰 |
| フロントエンド | 91件成功、失敗・スキップ0 |
| 型検査・本番用ビルド | 最終ソースの隔離コピーで成功。正規ソース133ファイルとの照合は不一致0 |
| 復元 | PostgreSQL 16、合成9問・16テーブル。データ、65制約、61索引、12採番状態と全サービス検査が成功 |
| 通常DBの構造移行 | バックアップ保持後、通常のdb:migrateで005・006を適用。反復適用は追加0件 |
| 通常DBの保全 | 構造移行前後の旧5問・20肢のID、本文、正答、日時と、利用者・履歴・お気に入り・決済・会員の件数・照合値が一致 |
| 設定・原資料保護 | 設定／合成サンプル、全Git履歴の原資料保護、差分検査に合格 |
| 独立レビュー | 別担当がバックエンドと運用処理を読取点検。公開切替、削除範囲、006、入出力・下書き保持の指摘は修正後に再確認 |

初回から第3回までの不合格と原因・修正記録は保持し、最終成功へ書き換えていない。最終結果は006のSQLパラメータ型競合を明示キャストで修正した後の再検証である。

根拠の正本はGit非追跡の `local-only/grouped-implementation-20261027/verification.md` と同フォルダの `server-tests-final-pass.log`、`frontend-tests-final.log`、`typecheck-complete.log`、`build-final.log`、`build-source-match.json`、`restore-drill-final.log`、`final-preservation.json`、独立レビュー記録である。バックアップ・認証情報・問題本文・原資料はこの公開用記録に含めない。

## 実画面・実APIでの操作

通常DBと分離した検証専用DBに、合成38問（4大問30問＋単独8問）と検証管理者だけを用意した。自動検査用DBも画面検証用DBから分離し、通常の利用者・認証情報・実問題は複製していない。

- PC1440px、SP390px・320pxで演習、管理全体プレビュー、短答編集を実操作し、横はみ出しがないことを確認した。
- 共通本文A・B、下線・空欄・表、参照先への移動と焦点、本文の折りたたみ、4大問の8・7・8・7問と末尾30問への移動を確認した。
- 選択式採点、短答の字数不足時の送信制御、許容別表記による正答、回答後の書籍出典、両型の履歴と短答復元、お気に入りの実DB保持を確認した。
- 管理の同一内容保存・再読込、並べ替え・再読込、短答の反復保存、公開検査・公開後の再読込を確認した。URL用の通し番号は並べ替えで振り直さない。
- 共通本文の一時編集で8小問・履歴2件への影響表示を確認し、保存せず再読込で破棄した。実際の履歴削除と対象外保持は隔離DBの自動検査で確認した。
- 操作後は合成38問・履歴2件・お気に入り1件、最大内容バージョン1を保持した。最終ビルド後もPC・SPでヒントの重複、空欄リンク名、管理プレビュー1〜8番、公開済み回答形式の無効化を再確認し、画面画像をローカル保存した。

論述・複数正答、制限時間・受験セッションは今回の実装対象に含めない。ローカルでの実装・検証完了を、実問題の後続登録、コミット、リモート反映又は本番検証の完了へ置き換えない。

## 変更ファイル一覧

実装作業の差分と未追跡の正規ソースを、下記の記録時点で列挙した。既存の末尾 ` 2` の重複10件、実装前からある引き継ぎr39〜r47、Git非追跡の原資料・バックアップ・実行ログは今回の変更一覧から除外する。承認済み設計案は実装前に作成された文書として区別する。実装中の引き継ぎr48〜r50は変更不可の経過記録として含める。後続の問題登録で生じる差分はこの機能実装の成果へ混ぜない。

一覧は61ファイルであり、各リンクはリポジトリ内の実ファイルを指す。

| ファイル | 区分 | 変更内容 |
| --- | --- | --- |
| [AGENTS.md](<../AGENTS.md>) | 変更 | 大問・短答・関連分類・出典・履歴影響について共通ルールを更新。 |
| [README.md](<../README.md>) | 変更 | 対応形式、管理導線、アーカイブ、実装と問題登録の区別を案内。 |
| [config/exam.json](<../config/exam.json>) | 変更 | 実装時に教材枠を2枠とし、単独大問・30問模試の構成規則を追加。 |
| [docs/architecture.md](<../docs/architecture.md>) | 変更 | 教材・大問・小問のDB、API、採点・参照・公開境界を説明。 |
| [docs/customization.md](<../docs/customization.md>) | 変更 | 段階保存、公開、短答、出典、v2入出力と移行の操作を説明。 |
| [docs/grouped-question-design-20261027.md](<../docs/grouped-question-design-20261027.md>) | 既存案・注記 | 承認済み設計案を保持し、実装完了記録への参照を追加。 |
| [docs/grouped-question-implementation-20261027.md](<../docs/grouped-question-implementation-20261027.md>) | 新規 | 本記録。実装内容、検証時点、根拠、変更ファイルを整理。 |
| [docs/verification.md](<../docs/verification.md>) | 変更 | 今回の最終検証結果と後続の問題登録との境界を追記。 |
| [docs/workflow/contexts/product.md](<../docs/workflow/contexts/product.md>) | 変更 | 教材形式と実装・検証の到達点を更新。 |
| [docs/workflow/contexts/service.md](<../docs/workflow/contexts/service.md>) | 変更 | 機能実装の進捗、依存作業、引き継ぎを更新。 |
| [docs/workflow/handoffs/2026-10-27T09-40-21-142Z-r48.json](<../docs/workflow/handoffs/2026-10-27T09-40-21-142Z-r48.json>) | 新規 | 初回統合評価と再検証対象の変更不可記録。 |
| [docs/workflow/handoffs/2026-10-27T09-57-44-047Z-r49.json](<../docs/workflow/handoffs/2026-10-27T09-57-44-047Z-r49.json>) | 新規 | 第2回評価と公開・削除範囲の修正方針を記録。 |
| [docs/workflow/handoffs/2026-10-27T10-05-52-637Z-r50.json](<../docs/workflow/handoffs/2026-10-27T10-05-52-637Z-r50.json>) | 新規 | 第3回評価、SQL型競合と検証DB分離を記録。 |
| [docs/workflow/state.json](<../docs/workflow/state.json>) | 変更 | 受入条件、評価、証拠と次作業を親担当が管理。 |
| [frontend/app/components/ExamSidebar.vue](<../frontend/app/components/ExamSidebar.vue>) | 変更 | 実在する公開小問と大問順を使って演習リンクを表示。 |
| [frontend/app/components/QuestionAnswerForm.vue](<../frontend/app/components/QuestionAnswerForm.vue>) | 新規 | 選択式と語句記述の入力・制約・送信を共通化。 |
| [frontend/app/components/QuestionContentBlocks.vue](<../frontend/app/components/QuestionContentBlocks.vue>) | 変更 | 共通本文、安定ID、参照位置と各表示ブロックを描画。 |
| [frontend/app/components/QuestionInlineText.vue](<../frontend/app/components/QuestionInlineText.vue>) | 新規 | 通常文・下線・空欄の構造化インラインを安全に描画。 |
| [frontend/app/components/admin/AdminContentBlockEditor.vue](<../frontend/app/components/admin/AdminContentBlockEditor.vue>) | 変更 | 共通本文のID・インライン・表等の編集を追加。 |
| [frontend/app/components/admin/AdminQuestionForm.vue](<../frontend/app/components/admin/AdminQuestionForm.vue>) | 変更 | 大問所属、短答、関連分類、出典、参照と履歴影響を編集。 |
| [frontend/app/components/admin/AdminQuestionPreview.vue](<../frontend/app/components/admin/AdminQuestionPreview.vue>) | 変更 | 共通本文と回答形式を含めて小問をプレビュー。 |
| [frontend/app/components/admin/AdminSourceEditor.vue](<../frontend/app/components/admin/AdminSourceEditor.vue>) | 新規 | 書籍・Webの構造化出典を編集。 |
| [frontend/app/composables/usePublicExamCatalog.ts](<../frontend/app/composables/usePublicExamCatalog.ts>) | 新規 | 公開カタログを共有し、画面間の問題構成を一致させる。 |
| [frontend/app/layouts/admin.vue](<../frontend/app/layouts/admin.vue>) | 変更 | 教材管理への共通導線を追加。 |
| [frontend/app/pages/admin/exams/[examNumber].vue](<../frontend/app/pages/admin/exams/[examNumber].vue>) | 新規 | 教材・大問・共通本文・小問順、検査と公開を管理。 |
| [frontend/app/pages/admin/exams/index.vue](<../frontend/app/pages/admin/exams/index.vue>) | 新規 | 教材枠と形式・公開状態の管理一覧を追加。 |
| [frontend/app/pages/admin/questions/[questionId]/edit.vue](<../frontend/app/pages/admin/questions/[questionId]/edit.vue>) | 変更 | 大問文脈と編集バージョンを引き継いで小問を編集。 |
| [frontend/app/pages/admin/questions/new.vue](<../frontend/app/pages/admin/questions/new.vue>) | 変更 | 教材・大問・小問番号を引き継いで新問を作成。 |
| [frontend/app/pages/exam-overview.vue](<../frontend/app/pages/exam-overview.vue>) | 変更 | 対応する大問構成と回答形式を説明し、公開一覧へ案内。 |
| [frontend/app/pages/favorites.vue](<../frontend/app/pages/favorites.vue>) | 変更 | 大問・小問の表示番号を含む一覧へ対応。 |
| [frontend/app/pages/history.vue](<../frontend/app/pages/history.vue>) | 変更 | 両回答形式の履歴と短答の復元表示に対応。 |
| [frontend/app/pages/index.vue](<../frontend/app/pages/index.vue>) | 変更 | 公開教材の構成・条件別件数から開始位置を決定。 |
| [frontend/app/pages/practice/[examNumber]/[questionNumber].vue](<../frontend/app/pages/practice/[examNumber]/[questionNumber].vue>) | 変更 | 共通本文、短答、参照移動、回答復元、大問順の演習を実装。 |
| [frontend/app/types/adminQuestion.ts](<../frontend/app/types/adminQuestion.ts>) | 変更 | 管理フォームの大問・短答・出典・参照型を追加。 |
| [frontend/app/utils/adminQuestionForm.ts](<../frontend/app/utils/adminQuestionForm.ts>) | 新規 | 新入力の整形と下書き用の初期値を共通化。 |
| [frontend/app/utils/examCatalog.ts](<../frontend/app/utils/examCatalog.ts>) | 変更 | 公開カタログの教材・大問・小問を扱う。 |
| [frontend/app/utils/learningPresentation.ts](<../frontend/app/utils/learningPresentation.ts>) | 新規 | 大問番号、本文参照、短答制約等の表示処理を共通化。 |
| [frontend/app/utils/practiceSequence.ts](<../frontend/app/utils/practiceSequence.ts>) | 変更 | 公開中の実在小問を使って演習順序を組み立てる。 |
| [frontend/server-tests/api.test.ts](<../frontend/server-tests/api.test.ts>) | 変更 | 新回答契約、編集競合と既存のHTTP認可を検査。 |
| [frontend/server-tests/archive-optional.test.ts](<../frontend/server-tests/archive-optional.test.ts>) | 変更 | 旧省略属性の保持とv2書出しの整合を検査。 |
| [frontend/server-tests/content-v2.test.ts](<../frontend/server-tests/content-v2.test.ts>) | 新規 | v2検証、輸送ID、親公開状態、空DB限定と入出力を検査。 |
| [frontend/server-tests/grouped-learning.test.ts](<../frontend/server-tests/grouped-learning.test.ts>) | 新規 | 7/8問・30問、短答、参照、履歴・ID、公開・削除範囲を検査。 |
| [frontend/server-tests/learning.test.ts](<../frontend/server-tests/learning.test.ts>) | 変更 | 従来教材の公開完成条件と既存学習機能の回帰を検査。 |
| [frontend/server-tests/operations.test.ts](<../frontend/server-tests/operations.test.ts>) | 変更 | 005/006の段階移行と既存データ保持・再実行を検査。 |
| [frontend/server/database/migrations/005_grouped_questions.sql](<../frontend/server/database/migrations/005_grouped_questions.sql>) | 新規 | 大問、共通本文、参照、短答、関連分類、回答バージョンを追加。 |
| [frontend/server/database/migrations/006_lock_published_answer_types.sql](<../frontend/server/database/migrations/006_lock_published_answer_types.sql>) | 新規 | 公開済み回答形式を、下書きへ戻しても固定する列を追加。 |
| [frontend/server/operations/archive-common.ts](<../frontend/server/operations/archive-common.ts>) | 新規 | アーカイブの形式・照合値・安全なエラー処理を共有。 |
| [frontend/server/operations/content-v2.ts](<../frontend/server/operations/content-v2.ts>) | 新規 | 大問・短答・参照を含むv2の検証と空DB入出力を実装。 |
| [frontend/server/operations/content.ts](<../frontend/server/operations/content.ts>) | 変更 | 新規書出しをv2へ統一し、v1読込と空DB保護を維持。 |
| [frontend/server/operations/restore-drill.ts](<../frontend/server/operations/restore-drill.ts>) | 変更 | 合成データによる大問・短答を含む16テーブルの復元検査を追加。 |
| [frontend/server/services/learning-structure.ts](<../frontend/server/services/learning-structure.ts>) | 新規 | 教材・大問一括保存、参照整合、公開検査、削除範囲を実装。 |
| [frontend/server/services/learning-validation.ts](<../frontend/server/services/learning-validation.ts>) | 変更 | 構造化本文・出典、回答型・制約・分類・参照を検証。 |
| [frontend/server/services/learning-writer.ts](<../frontend/server/services/learning-writer.ts>) | 変更 | 共通書込、ID保持、競合・公開形式固定、対象履歴処理を実装。 |
| [frontend/server/services/learning.ts](<../frontend/server/services/learning.ts>) | 変更 | 公開・管理API、認可、短答採点、重複回答防止と履歴を拡張。 |
| [frontend/shared/examConfig.ts](<../frontend/shared/examConfig.ts>) | 変更 | 教材形式別の構成規則と旧設定の互換読取を追加。 |
| [frontend/shared/types/learning.ts](<../frontend/shared/types/learning.ts>) | 新規 | 教材・大問・本文・参照・出典・回答入力の共通型を追加。 |
| [frontend/tests/adminGroupedQuestion.test.ts](<../frontend/tests/adminGroupedQuestion.test.ts>) | 新規 | 管理フォームの短答・参照・正規化を検査。 |
| [frontend/tests/examConfig.test.ts](<../frontend/tests/examConfig.test.ts>) | 変更 | 形式別規則と旧設定の互換性を検査。 |
| [frontend/tests/examSidebarLayout.test.ts](<../frontend/tests/examSidebarLayout.test.ts>) | 変更 | 公開小問一覧を使うサイドバーの構造を検査。 |
| [frontend/tests/groupedLearningPresentation.test.ts](<../frontend/tests/groupedLearningPresentation.test.ts>) | 新規 | 大問表示、本文参照、短答条件と公開順序を検査。 |
| [scripts/check-template.mjs](<../scripts/check-template.mjs>) | 変更 | 形式設定と合成サンプルを分離し、追加教材枠を誤って不足扱いしない。 |

実装完了の評価・引き継ぎ：[合格評価](workflow/handoffs/2026-10-27T10-27-13-539Z-r51.json)、[完了記録](workflow/handoffs/2026-10-27T10-27-16-925Z-r52.json)。
