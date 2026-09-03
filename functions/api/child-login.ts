import {
  ensureSchema, createSession, setSessionCookie, json, fail, verifySecret, bodyOf, apiError,
} from "./_lib";

export const onRequestPost = async (context: any) => {
  try {
    const env = context.env;
    await ensureSchema(env);
    const body = await bodyOf(context.request);
    const code = String(body.code || "").trim().toUpperCase();
    const childId = String(body.childId || "");
    const pin = String(body.pin || "").trim();
    if (!code || !childId || !pin) return fail("请完整填写家庭码和密码");

    const family: any = await env.DB.prepare(`SELECT id FROM families WHERE code=?`).bind(code).first();
    if (!family) return fail("家庭码没找到，请家长在设置页核对一下");
    const child: any = await env.DB.prepare(
      `SELECT * FROM users WHERE id=? AND family_id=? AND role='child'`
    ).bind(childId, family.id).first();
    if (!child) return fail("没有找到这个小朋友");
    if (!(await verifySecret(pin, child.secret_hash))) return fail("密码不对哦，再试一次");

    const token = await createSession(env, child.id);
    const res = json({ ok: true });
    return setSessionCookie(res, token);
  } catch (e: any) {
    return apiError(e);
  }
};
