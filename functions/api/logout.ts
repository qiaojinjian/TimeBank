import { ensureSchema, clearSessionCookie, json, parseCookies } from "./_lib";

export const onRequestPost = async (context: any) => {
  await ensureSchema(context.env);
  const cookies = parseCookies(context.request.headers.get("Cookie"));
  const token = cookies["tb_session"];
  if (token) {
    await context.env.DB.prepare(`DELETE FROM sessions WHERE token=?`).bind(token).run();
  }
  return clearSessionCookie(json({ ok: true }));
};
