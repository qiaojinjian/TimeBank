import { requireAuth, apiError, json, fail, credit, uid } from "../../_lib";

// 孩子完成任务打卡
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, params } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能打卡哦", 403);
    const taskId = params.id;
    const task: any = await env.DB.prepare(
      `SELECT * FROM tasks WHERE id=? AND family_id=? AND active=1 AND (assignee IS NULL OR assignee=?)`
    ).bind(taskId, user.family_id, user.id).first();
    if (!task) return fail("任务不存在或已下架");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 重复性检查
    if (task.kind === "daily") {
      const dup: any = await env.DB.prepare(
        `SELECT id FROM completions WHERE task_id=? AND child_id=? AND created_at>=?`
      ).bind(task.id, user.id, todayStart.toISOString()).first();
      if (dup) return fail("这个任务今天已经打过卡啦，明天再来！");
    } else {
      const dup: any = await env.DB.prepare(
        `SELECT id FROM completions WHERE task_id=? AND child_id=? AND status IN ('pending','approved')`
      ).bind(task.id, user.id).first();
      if (dup) return fail("这个任务已经完成过啦");
    }

    const completionId = uid();
    if (task.approve === "auto") {
      await credit(env, user.id, task.amount, "task", task.title);
      await env.DB.prepare(
        `INSERT INTO completions(id, task_id, child_id, amount, status, reviewed_at) VALUES(?,?,?,?,?,?)`
      ).bind(completionId, task.id, user.id, task.amount, "approved", new Date().toISOString()).run();
      return json({ ok: true, status: "approved", amount: task.amount });
    } else {
      await env.DB.prepare(
        `INSERT INTO completions(id, task_id, child_id, amount, status) VALUES(?,?,?,?,?)`
      ).bind(completionId, task.id, user.id, task.amount, "pending").run();
      return json({ ok: true, status: "pending", amount: task.amount });
    }
  } catch (e: any) {
    return apiError(e);
  }
};
