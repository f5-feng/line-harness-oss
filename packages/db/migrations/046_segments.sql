-- 046_segments.sql
-- 保存セグメント (saved segments)。配信のたびに絞り込み条件を組み直す代わりに、
-- 条件セットを名前付きで保存して再利用できるようにする。
-- conditions は SegmentCondition の JSON ({ operator: 'AND'|'OR', rules: SegmentRule[] })。
-- broadcasts.segment_conditions と同じ形式なので、配信時はそのまま流用できる。

CREATE TABLE IF NOT EXISTS segments (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  conditions  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now', '+9 hours'))
);
