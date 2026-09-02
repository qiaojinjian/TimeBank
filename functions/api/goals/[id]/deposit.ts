import { requireAuth, apiError, json, fail, debit, uid } from "../../_lib";

// 往存钱罐里存时币
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, params, body } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能存钱", 403);
    const goalId = params.id;
    const amount = Math.floor(Number(body.amount) || 0);
    if (amount < 1) return fail("至少存 1 时币");

    const goal: any = await env.DB.prepare(
      `SELECT * FROM goals WHERE id=? AND user_id=?`
    ).bind(goalId, user.id).first();
    if (!goal) return fail("存钱罐不存在");
    if (goal.status !== "active") return fail("这个存钱罐已经装满啦");

    await debit(env, user.id, amount, "goal", `存入存钱罐「${goal.title}」`);

    const saved = goal.saved + amount;
    const status = saved >= goal.target ? "achieved" : "active";
    await env.DB.prepare(
      `UPDATE goals SET saved=?, status=? WHERE id=?`
    ).bind(saved, status, goal.id).run();

    return json({ ok: true, saved, achieved: status === "achieved" });
  } catch (e: any) {
    return apiError(e);
  }
};
