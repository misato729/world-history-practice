# 模擬試験結果保存の本番反映（2026-11-01）

ユーザーのDB更新・commit・push・deployの明示依頼による。本番の既存Netlify/Fly.io/Neonへ反映し、Netlify自動ビルド停止は維持する。

## DB

Neonへ共通migrationから008_practice_attempts.sqlのみ適用。既存15表の件数・内容ダイジェストが同一であることをトランザクション内で確認。問題210件を含む既存データに変更なし。秘密を含まない詳細結果はローカル専用のlocal-only/mock-results-release-20261101/database-update.json。

## 配信

作業中。Git・配信・本番確認の結果を追記する。
