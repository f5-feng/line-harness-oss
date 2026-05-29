import { Hono } from 'hono';
import { getSegments, getSegmentById, createSegment, deleteSegment } from '@line-crm/db';
import type { Segment as DbSegment } from '@line-crm/db';
import type { SegmentCondition } from '../services/segment-query.js';
import type { Env } from '../index.js';

const segments = new Hono<Env>();

// conditions は DB では JSON 文字列。API では parse して返す。
// 壊れた JSON は握りつぶさず空条件にフォールバックして 500 を避ける。
function serializeSegment(row: DbSegment) {
  let conditions: SegmentCondition;
  try {
    conditions = JSON.parse(row.conditions) as SegmentCondition;
  } catch {
    conditions = { operator: 'AND', rules: [] };
  }
  return {
    id: row.id,
    name: row.name,
    conditions,
    createdAt: row.created_at,
  };
}

function isValidCondition(c: unknown): c is SegmentCondition {
  if (typeof c !== 'object' || c === null) return false;
  const cond = c as Record<string, unknown>;
  // 空 rules は全員マッチになり危険なので 1 件以上を必須にする。
  return (
    (cond.operator === 'AND' || cond.operator === 'OR') &&
    Array.isArray(cond.rules) &&
    cond.rules.length > 0
  );
}

// GET /api/segments — list saved segments
segments.get('/api/segments', async (c) => {
  try {
    const items = await getSegments(c.env.DB);
    return c.json({ success: true, data: items.map(serializeSegment) });
  } catch (err) {
    console.error('GET /api/segments error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/segments — create a saved segment
segments.post('/api/segments', async (c) => {
  try {
    const body = await c.req.json<{ name?: string; conditions?: unknown }>();

    if (!body.name || !body.name.trim()) {
      return c.json({ success: false, error: 'name is required' }, 400);
    }
    if (!isValidCondition(body.conditions)) {
      return c.json(
        { success: false, error: 'conditions with operator and rules array is required' },
        400,
      );
    }

    const segment = await createSegment(c.env.DB, {
      name: body.name.trim(),
      conditions: JSON.stringify(body.conditions),
    });

    return c.json({ success: true, data: serializeSegment(segment) }, 201);
  } catch (err) {
    console.error('POST /api/segments error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/segments/:id — fetch one (used when reusing a saved segment)
segments.get('/api/segments/:id', async (c) => {
  try {
    const item = await getSegmentById(c.env.DB, c.req.param('id'));
    if (!item) return c.json({ success: false, error: 'Segment not found' }, 404);
    return c.json({ success: true, data: serializeSegment(item) });
  } catch (err) {
    console.error('GET /api/segments/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// DELETE /api/segments/:id — delete a saved segment
segments.delete('/api/segments/:id', async (c) => {
  try {
    await deleteSegment(c.env.DB, c.req.param('id'));
    return c.json({ success: true, data: null });
  } catch (err) {
    console.error('DELETE /api/segments/:id error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export { segments };
