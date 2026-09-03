import { requireAuth, apiError, json } from "./_lib";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// 游标 = base64(created_at|id)，配合 ORDER BY created_at DESC, id DESC 做 keyset 分页，
// 这样翻页期间新增的流水不会把下一页挤错位
function encodeCursor(createdAt: string, id: string): string {
  return btoa(`${createdAt}|${id}`);
}

function decodeCursor(raw: string): { createdAt: string; id: string } | null {
  try {
    const s = atob(raw);
    const i = s.indexOf("|");
    if (i < 1 || i === s.length - 1) return null;
    return { createdAt: s.slice(0, i), id: s.slice(i + 1) };
  } catch {
    return null;
  }
}

// 我的账本（流水，游标分页）
export const onRequestGet = async (context: any) => {
  try {
    const { env, user } = await requireAuth(context);
    const url = new URL(context.request.url);

    const rawLimit = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_LIMIT) : DEFAULT_LIMIT;

    const rawCursor = url.searchParams.get("cursor") || "";
    const cursor = rawCursor ? decodeCursor(rawCursor) : null;
    if (rawCursor && !cursor) return json({ error: "游标无效" }, 400);

    const params: any[] = [user.id];
    let sql = `SELECT * FROM ledger WHERE user_id=?`;
    if (cursor) {
      sql += ` AND (created_at < ? OR (created_at = ? AND id < ?))`;
      params.push(cursor.createdAt, cursor.createdAt, cursor.id);
    }
    sql += ` ORDER BY created_at DESC, id DESC LIMIT ?`;
    params.push(limit + 1); // 多取一条，用来判断是否还有下一页

    const res: any = await env.DB.prepare(sql).bind(...params).all();
    const rows: any[] = res.results || [];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];

    return json({
      ledger: page,
      nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
      hasMore,
    });
  } catch (e: any) {
    return apiError(e);
  }
};
