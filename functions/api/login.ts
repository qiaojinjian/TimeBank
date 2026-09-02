import {
  ensureSchema, createSession, setSessionCookie, json, fail, verifySecret, bodyOf, apiError,
} from "./_lib";

export const onRequestPost = async (context: any) => {
  try {
    const env = context.env;
    await ensureSchema(env);
    const body = await bodyOf(context.request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const user: any = await env.DB.prepare(
      `SELECT * FROM users WHERE email=? AND role='parent'`
    ).bind(email).first();
    if (!user || !(await verifySecret(password, user.secret_hash))) {
      return fail("邮箱或密码不对，再试一次");
    }
    const token = await createSession(env, user.id);
    const res = json({ ok: true });
    return setSessionCookie(res, token);
  } catch (e: any) {
    return apiError(e);
  }
};
