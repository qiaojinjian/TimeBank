import { requireAuth, apiError, json, fail, credit } from "../../_lib";

// 审批单个打卡：approve（给时币）/ reject
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能审批", 403);
    const action = body.action === "reject" ? "reject" : "approve";
    const note = String(body.note || "").trim().slice(0, 60) || null;

    const comp: any = await env.DB.prepare(
      `SELECT c.*, t.family_id AS tfam, t.title AS task_title FROM completions c JOIN tasks t ON t.id=c.task_id WHERE c.id=?`
    ).bind(params.id).first();
    if (!comp || comp.tfam !== family.id) return fail("这条打卡不存在", 404);
    if (comp.status !== "pending") return fail("这条已经处理过啦");

    if (action === "approve") {
      await credit(env, comp.child_id, comp.amount, "task", `家长确认任务「${comp.task_title}」`);
    }
    await env.DB.prepare(
      `UPDATE completions SET status=?, reviewed_at=?, note=? WHERE id=?`
    ).bind(action === "approve" ? "approved" : "rejected", new Date().toISOString(), note, comp.id).run();

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
