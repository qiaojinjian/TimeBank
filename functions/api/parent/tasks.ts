import { requireAuth, apiError, json, fail, uid } from "../_lib";

export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");
    const res: any = await env.DB.prepare(
      `SELECT t.*, u.name AS assignee_name, u.avatar AS assignee_avatar
       FROM tasks t LEFT JOIN users u ON u.id = t.assignee
       WHERE t.family_id=? ORDER BY t.created_at DESC`
    ).bind(family.id).all();
    return json({ tasks: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能发任务", 403);

    const title = String(body.title || "").trim().slice(0, 24);
    const icon = String(body.icon || "⭐").slice(0, 4);
    const kind = body.kind === "once" ? "once" : "daily";
    const approve = body.approve === "auto" ? "auto" : "manual";
    const amount = Math.floor(Number(body.amount) || 1);
    const assignee = body.assignee ? String(body.assignee) : null;

    if (!title) return fail("任务名不能为空");
    if (amount < 1 || amount > 1000) return fail("时币奖励请在 1~1000 之间");

    // assignee 校验：必须是本家庭的孩子或 null
    if (assignee) {
      const k: any = await env.DB.prepare(
        `SELECT id FROM users WHERE id=? AND family_id=? AND role='child'`
      ).bind(assignee, family.id).first();
      if (!k) return fail("指定的小朋友不存在");
    }

    if (body.id) {
      // 更新
      const old: any = await env.DB.prepare(
        `SELECT id FROM tasks WHERE id=? AND family_id=?`
      ).bind(body.id, family.id).first();
      if (!old) return fail("任务不存在", 404);
      await env.DB.prepare(
        `UPDATE tasks SET title=?, icon=?, kind=?, approve=?, amount=?, assignee=? WHERE id=?`
      ).bind(title, icon, kind, approve, amount, assignee, body.id).run();
      return json({ ok: true, id: body.id });
    }

    const id = uid();
    await env.DB.prepare(
      `INSERT INTO tasks(id, family_id, title, icon, kind, amount, approve, assignee) VALUES(?,?,?,?,?,?,?,?)`
    ).bind(id, family.id, title, icon, kind, amount, approve, assignee).run();
    return json({ ok: true, id });
  } catch (e: any) {
    return apiError(e);
  }
};
