import { requireAuth, apiError, json, fail, uid, debit, todayStr, lotteryConfig, lotteryQuota } from "../_lib";

// 用时币购买抽奖机会（每天有上限）
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能买抽奖机会", 403);

    const cfg = await lotteryConfig(env, family.id);
    if (!cfg.enabled) return fail("抽奖还没有开放");
    const quota = await lotteryQuota(env, user.id, cfg);
    const count = Math.floor(Number(body.count) || 1);
    if (count < 1) return fail("至少买 1 次");
    if (count > quota.canBuy) return fail(`今天最多还能买 ${quota.canBuy} 次`);

    const cost = count * cfg.buyPrice;
    if (cost > 0) await debit(env, user.id, cost, "lottery_buy", `购买 ${count} 次抽奖机会`);
    await env.DB.prepare(
      `INSERT INTO lottery_purchases(id, user_id, day, count, coins) VALUES(?,?,?,?,?)`
    ).bind(uid(), user.id, todayStr(), count, cost).run();

    return json({ ok: true, cost, quota: await lotteryQuota(env, user.id, cfg) });
  } catch (e: any) {
    return apiError(e);
  }
};
