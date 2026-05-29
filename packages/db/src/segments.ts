import { jstNow } from './utils.js';

/**
 * 保存セグメント (saved segment) の DB 行。
 * conditions は SegmentCondition の JSON 文字列
 * ({ operator: 'AND'|'OR', rules: SegmentRule[] })。
 * broadcasts.segment_conditions と同じ形式なので、配信時にそのまま流用できる。
 */
export interface Segment {
  id: string;
  name: string;
  conditions: string;
  created_at: string;
}

export async function getSegments(db: D1Database): Promise<Segment[]> {
  const result = await db
    .prepare(`SELECT * FROM segments ORDER BY created_at DESC`)
    .all<Segment>();
  return result.results;
}

export async function getSegmentById(
  db: D1Database,
  id: string,
): Promise<Segment | null> {
  return (
    (await db.prepare(`SELECT * FROM segments WHERE id = ?`).bind(id).first<Segment>()) ??
    null
  );
}

export interface CreateSegmentInput {
  name: string;
  /** SegmentCondition の JSON 文字列 */
  conditions: string;
}

export async function createSegment(
  db: D1Database,
  input: CreateSegmentInput,
): Promise<Segment> {
  const id = crypto.randomUUID();
  const now = jstNow();

  await db
    .prepare(
      `INSERT INTO segments (id, name, conditions, created_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(id, input.name, input.conditions, now)
    .run();

  return (await db
    .prepare(`SELECT * FROM segments WHERE id = ?`)
    .bind(id)
    .first<Segment>())!;
}

export async function deleteSegment(db: D1Database, id: string): Promise<void> {
  await db.prepare(`DELETE FROM segments WHERE id = ?`).bind(id).run();
}
