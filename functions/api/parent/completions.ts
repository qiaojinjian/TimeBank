import { requireAuth, apiError, json } from "../_lib";

// 打卡审批列表
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");
    const url = new URL(context.request.url);
    const status = url.searchParams.get("status") || "pending";

    const res: any = await env.DB.prepare(
      `SELECT c.id, c.task_id, c.amount, c.status, c.created_at, c.note,
              t.title AS task_title, t.icon AS task_icon,
              u.name AS child_name, u.avatar AS child_avatar
       FROM completions c
       JOIN tasks t ON t.id = c.task_id
       JOIN users u ON u.id = c.child_id
       WHERE t.family_id=? AND c.status=?
       ORDER BY c.created_at DESC`
    ).bind(family.id, status).all();

    return json({ completions: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};
