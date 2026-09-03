import { requireAuth, apiError, json, fail, uid } from "../../_lib";

// 中奖的礼物奖：孩子决定「兑现」（生成审批）或「先不要」
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友能操作", 403);
    const action = body.action === "claim" ? "claim" : "skip";

    const draw: any = await env.DB.prepare(
      `SELECT * FROM lottery_draws WHERE id=? AND user_id=?`
    ).bind(params.id, user.id).first();
    if (!draw) return fail("没有找到这条中奖记录", 404);
    if (draw.status !== "pending") return fail("这条已经处理过啦");

    if (action === "claim") {
      await env.DB.prepare(
        `INSERT INTO redemptions(id, family_id, child_id, reward_id, kind, coins, status, note)
         VALUES(?,?,?,NULL,?,0,?,?)`
      ).bind(uid(), family.id, user.id, "lottery", "pending", draw.title).run();
    }
    await env.DB.prepare(`UPDATE lottery_draws SET status=? WHERE id=?`)
      .bind(action === "claim" ? "claimed" : "skipped", draw.id)
      .run();

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
