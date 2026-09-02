import { requireAuth, apiError, json, fail, uid } from "./_lib";

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, body } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能建存钱罐", 403);
    const title = String(body.title || "").trim().slice(0, 20);
    const icon = String(body.icon || "🎯").slice(0, 4);
    const target = Math.floor(Number(body.target) || 0);
    if (!title) return fail("给存钱罐起个名字吧");
    if (target < 10) return fail("目标至少要 10 时币哦");

    await env.DB.prepare(
      `INSERT INTO goals(id, user_id, title, icon, target) VALUES(?,?,?,?,?)`
    ).bind(uid(), user.id, title, icon, target).run();
    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
