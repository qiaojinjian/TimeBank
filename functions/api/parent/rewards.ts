import { requireAuth, apiError, json, fail, uid } from "../_lib";

// 家长管理奖励
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");
    const res: any = await env.DB.prepare(
      `SELECT * FROM rewards WHERE family_id=? ORDER BY active DESC, price ASC`
    ).bind(family.id).all();
    return json({ rewards: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能维护奖励", 403);
    const title = String(body.title || "").trim().slice(0, 24);
    const icon = String(body.icon || "🎁").slice(0, 4);
    const price = Math.floor(Number(body.price) || 0);
    if (!title) return fail("奖励名不能为空");
    if (price < 1 || price > 100000) return fail("价格请在 1~100000 之间");

    if (body.id) {
      const old: any = await env.DB.prepare(
        `SELECT id FROM rewards WHERE id=? AND family_id=?`
      ).bind(body.id, family.id).first();
      if (!old) return fail("奖励不存在", 404);
      await env.DB.prepare(
        `UPDATE rewards SET title=?, icon=?, price=? WHERE id=?`
      ).bind(title, icon, price, body.id).run();
      return json({ ok: true, id: body.id });
    }

    const id = uid();
    await env.DB.prepare(
      `INSERT INTO rewards(id, family_id, title, icon, price) VALUES(?,?,?,?,?)`
    ).bind(id, family.id, title, icon, price).run();
    return json({ ok: true, id });
  } catch (e: any) {
    return apiError(e);
  }
};
