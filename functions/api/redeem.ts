import { requireAuth, apiError, json, fail, debit, uid } from "./_lib";

// 孩子兑换奖励（时币即时扣除，家长审批后兑现）
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能兑换奖励", 403);
    const rewardId = String(body.rewardId || "");
    const reward: any = await env.DB.prepare(
      `SELECT * FROM rewards WHERE id=? AND family_id=? AND active=1`
    ).bind(rewardId, family.id).first();
    if (!reward) return fail("这个奖励不存在或已下架");

    await debit(env, user.id, reward.price, "redeem", `兑换「${reward.title}」`);

    await env.DB.prepare(
      `INSERT INTO redemptions(id, family_id, child_id, reward_id, kind, coins, status) VALUES(?,?,?,?,?,?,?)`
    ).bind(uid(), family.id, user.id, reward.id, "reward", reward.price, "pending").run();

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
