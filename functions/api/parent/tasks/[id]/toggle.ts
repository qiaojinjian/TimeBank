import { requireAuth, apiError, json, fail } from "../../../_lib";

// 上下架任务
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能操作", 403);
    const task: any = await env.DB.prepare(
      `SELECT id FROM tasks WHERE id=? AND family_id=?`
    ).bind(params.id, family.id).first();
    if (!task) return fail("任务不存在", 404);
    const active = body.active ? 1 : 0;
    await env.DB.prepare(`UPDATE tasks SET active=? WHERE id=?`).bind(active, params.id).run();
    return json({ ok: true, active });
  } catch (e: any) {
    return apiError(e);
  }
};
