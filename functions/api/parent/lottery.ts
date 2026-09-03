import { requireAuth, apiError, json, fail, uid } from "../_lib";

export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能查看抽奖设置", 403);
    const cfg: any = await env.DB.prepare(`SELECT * FROM lottery_config WHERE family_id=?`).bind(family.id).first();
    const res: any = await env.DB.prepare(
      `SELECT * FROM lottery_prizes WHERE family_id=? ORDER BY sort, created_at`
    ).bind(family.id).all();
    return json({
      config: cfg || { daily_free: 1, task_gift_every: 3, task_gift_cap: 2, buy_limit: 3, buy_price: 5, enabled: 1 },
      prizes: res.results,
    });
  } catch (e: any) {
    return apiError(e);
  }
};

const int = (v: any, def: number, min: number, max: number) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
};

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能修改抽奖设置", 403);

    const c = body.config || {};
    await env.DB.prepare(
      `INSERT INTO lottery_config(family_id, daily_free, task_gift_every, task_gift_cap, buy_limit, buy_price, enabled)
       VALUES(?,?,?,?,?,?,?)
       ON CONFLICT(family_id) DO UPDATE SET
         daily_free=excluded.daily_free, task_gift_every=excluded.task_gift_every,
         task_gift_cap=excluded.task_gift_cap, buy_limit=excluded.buy_limit,
         buy_price=excluded.buy_price, enabled=excluded.enabled`
    ).bind(
      family.id,
      int(c.dailyFree, 1, 0, 50),
      int(c.taskGiftEvery, 3, 0, 50),
      int(c.taskGiftCap, 2, 0, 20),
      int(c.buyLimit, 3, 0, 50),
      int(c.buyPrice, 5, 0, 999),
      c.enabled ? 1 : 0
    ).run();

    // 奖项整表替换（抽奖结果里已经快照了标题/图标，删掉也不影响历史）
    const prizes = Array.isArray(body.prizes) ? body.prizes.slice(0, 12) : [];
    const stmts: any[] = [env.DB.prepare(`DELETE FROM lottery_prizes WHERE family_id=?`).bind(family.id)];
    prizes.forEach((p: any, i: number) => {
      const title = String(p.title || "").trim().slice(0, 24);
      if (!title) return;
      const kind = ["coins", "gift", "none"].includes(p.kind) ? p.kind : "coins";
      stmts.push(
        env.DB.prepare(
          `INSERT INTO lottery_prizes(id, family_id, title, icon, kind, coins, weight, active, sort) VALUES(?,?,?,?,?,?,?,?,?)`
        ).bind(
          p.id || uid(),
          family.id,
          title,
          String(p.icon || "🎁").slice(0, 4),
          kind,
          kind === "coins" ? int(p.coins, 1, 1, 9999) : 0,
          int(p.weight, 1, 0, 10000),
          p.active === false || p.active === 0 ? 0 : 1,
          i
        )
      );
    });
    if (stmts.length) await env.DB.batch(stmts);

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
