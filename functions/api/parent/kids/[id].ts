import { requireAuth, apiError, json, fail, hashSecret } from "../../_lib";

// 单孩子操作：删除 / 重置密码（PUT 处理两种）
const deleteChild = async (env: any, childId: string, familyId: string) => {
  const child: any = await env.DB.prepare(
    `SELECT * FROM users WHERE id=? AND family_id=? AND role='child'`
  ).bind(childId, familyId).first();
  if (!child) throw new Error("not found");
  if (child.balance > 0) return fail("这个小朋友还有余额，先花完或转出再删吧");
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM users WHERE id=?`).bind(childId),
    env.DB.prepare(`DELETE FROM completions WHERE child_id=?`).bind(childId),
    env.DB.prepare(`DELETE FROM deposits WHERE user_id=?`).bind(childId),
    env.DB.prepare(`DELETE FROM goals WHERE user_id=?`).bind(childId),
    env.DB.prepare(`DELETE FROM ledger WHERE user_id=?`).bind(childId),
    env.DB.prepare(`DELETE FROM redemptions WHERE child_id=?`).bind(childId),
  ]);
  return json({ ok: true });
};

export const onRequestDelete = async (context: any) => {
  try {
    const { env, user, family, params } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长才能删除", 403);
    const res = await deleteChild(env, params.id, family.id);
    return res;
  } catch (e: any) {
    if (e?.message === "not found") return fail("没找到这个小朋友", 404);
    return apiError(e);
  }
};

export const onRequestPut = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长才能操作", 403);
    const childId = params.id;
    const child: any = await env.DB.prepare(
      `SELECT id FROM users WHERE id=? AND family_id=? AND role='child'`
    ).bind(childId, family.id).first();
    if (!child) return fail("没找到这个小朋友", 404);

    // 支持重命名 / 换头像 / 重置密码
    if (body.action === "reset-pin") {
      const pin = String(body.pin || "").trim();
      if (!/^\d{4,6}$/.test(pin)) return fail("密码请设置 4~6 位数字");
      const hash = await hashSecret(pin);
      await env.DB.prepare(`UPDATE users SET secret_hash=? WHERE id=?`).bind(hash, childId).run();
      return json({ ok: true });
    }
    const name = String(body.name || "").trim().slice(0, 12);
    const avatar = String(body.avatar || "").slice(0, 4);
    if (name && avatar) {
      await env.DB.prepare(`UPDATE users SET name=?, avatar=? WHERE id=?`).bind(name, avatar, childId).run();
      return json({ ok: true });
    }
    if (name) {
      await env.DB.prepare(`UPDATE users SET name=? WHERE id=?`).bind(name, childId).run();
      return json({ ok: true });
    }
    return fail("没有要修改的内容");
  } catch (e: any) {
    return apiError(e);
  }
};
