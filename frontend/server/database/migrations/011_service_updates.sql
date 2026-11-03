CREATE TABLE service_updates (
 id BIGSERIAL PRIMARY KEY,
 published_on DATE NOT NULL,
 content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000),
 lock_version INTEGER NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX service_updates_display_order ON service_updates(published_on DESC,id DESC);
INSERT INTO service_updates(published_on,content) VALUES
 ('2026-11-01','本サービスをリリースしました'),
 ('2026-11-02','機能改善・機能追加を行いました'),
 ('2026-11-03','機能改善・機能追加を行いました');
