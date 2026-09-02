import {
  ensureSchema, uid, genCode, hashSecret, createSession, setSessionCookie,
  json, fail, HttpError, bodyOf,
} from "./_lib";

export const onRequestPost = async (context: any) => {
  try {
    const env = context.env;
    await ensureSchema(env);
    const body = await bodyOf(context.request);
    const familyName = String(body.familyName || "").trim().slice(0, 20);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!familyName) return fail("请填写家庭名称");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("请填写正确的邮箱");
    if (password.length < 6) return fail("密码至少 6 位");

    const exists: any = await env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(email).first();
    if (exists) return fail("这个邮箱已经注册过了，请直接登录", 409);

    // 生成唯一家庭码
    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const c: any = await env.DB.prepare(`SELECT id FROM families WHERE code=?`).bind(code).first();
      if (!c) break;
      code = genCode();
    }

    const familyId = uid();
    const userId = uid();
    const hash = await hashSecret(password);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO families(id, code, name) VALUES(?,?,?)`
      ).bind(familyId, code, familyName),
      env.DB.prepare(
        `INSERT INTO users(id, family_id, role, name, avatar, email, secret_hash) VALUES(?,?,?,?,?,?,?)`
      ).bind(userId, familyId, "parent", "家长", "🦉", email, hash),
    ]);

    const token = await createSession(env, userId);
    const res = json({ ok: true, familyCode: code });
    return setSessionCookie(res, token);
  } catch (e: any) {
    return fail("注册失败，请稍后再试", 500);
  }
};
