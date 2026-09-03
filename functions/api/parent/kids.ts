import {
  requireAuth, apiError, json, fail, uid, hashSecret, settleDeposits, uniqueHandle,
} from "../_lib";

export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");
    const pre: any = await env.DB.prepare(
      `SELECT id FROM users WHERE family_id=? AND role='child'`
    ).bind(family.id).all();
    for (const k of pre.results as any[]) {
      await settleDeposits(env, k.id);
    }
    const res: any = await env.DB.prepare(
      `SELECT id, name, avatar, balance, created_at FROM users WHERE family_id=? AND role='child' ORDER BY created_at`
    ).bind(family.id).all();
    return json({ code: family.code, kids: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长才能添加小朋友", 403);
    const name = String(body.name || "").trim().slice(0, 12);
    const avatar = String(body.avatar || "😀").slice(0, 4);
    const pin = String(body.pin || "").trim();
    if (!name) return fail("给小朋友起个名字吧");
    if (!/^\d{4,6}$/.test(pin)) return fail("密码请设置 4~6 位数字");
    if (pin.length > 6 || pin.length < 4) return fail("密码请设置 4~6 位数字");

    const id = uid();
    const hash = await hashSecret(pin);
    const handle = await uniqueHandle(env);
    await env.DB.prepare(
      `INSERT INTO users(id, family_id, role, name, avatar, secret_hash, handle) VALUES(?,?,?,?,?,?,?)`
    ).bind(id, family.id, "child", name, avatar, hash, handle).run();
    return json({ ok: true, id, handle });
  } catch (e: any) {
    return apiError(e);
  }
};
