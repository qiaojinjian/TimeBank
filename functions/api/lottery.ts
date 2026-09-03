import { requireAuth, apiError, json, lotteryConfig, lotteryQuota } from "./_lib";

// 孩子端抽奖首页：机会、奖项概率、我的奖品
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "child") return json({ enabled: 0, quota: null, prizes: [], draws: [] });

    const cfg = await lotteryConfig(env, family.id);
    const quota = await lotteryQuota(env, user.id, cfg);
    const res: any = await env.DB.prepare(
      `SELECT id, title, icon, kind, coins, weight FROM lottery_prizes WHERE family_id=? AND active=1 ORDER BY sort`
    ).bind(family.id).all();
    const prizes = res.results as any[];
    const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);

    const drawsRes: any = await env.DB.prepare(
      `SELECT * FROM lottery_draws WHERE user_id=? ORDER BY created_at DESC LIMIT 20`
    ).bind(user.id).all();

    return json({
      enabled: cfg.enabled,
      quota,
      prizes: prizes.map((p) => ({
        ...p,
        pct: totalWeight > 0 ? Math.round((p.weight / totalWeight) * 1000) / 10 : 0,
      })),
      draws: drawsRes.results,
    });
  } catch (e: any) {
    return apiError(e);
  }
};
