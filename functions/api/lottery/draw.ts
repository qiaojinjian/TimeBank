import { requireAuth, apiError, json, fail, uid, credit, lotteryConfig, lotteryQuota } from "../_lib";

// 抽一次：扣 1 次机会 → 按权重开奖 → 时币奖立即到账，礼物奖等孩子决定要不要兑现
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能抽奖", 403);

    const cfg = await lotteryConfig(env, family.id);
    if (!cfg.enabled) return fail("抽奖还没有开放，请家长在「奖励」里开启");
    const quota = await lotteryQuota(env, user.id, cfg);
    if (quota.left <= 0) return fail("今天的抽奖机会用完啦，做任务或用时币买次数吧");

    const res: any = await env.DB.prepare(
      `SELECT * FROM lottery_prizes WHERE family_id=? AND active=1 AND weight>0 ORDER BY sort`
    ).bind(family.id).all();
    const prizes = res.results as any[];
    if (prizes.length === 0) return fail("还没有设置奖项，先让家长去添加吧");

    const total = prizes.reduce((s, p) => s + p.weight, 0);
    let rnd = Math.random() * total;
    let hit = prizes[0];
    for (const p of prizes) {
      rnd -= p.weight;
      if (rnd < 0) {
        hit = p;
        break;
      }
    }

    const status = hit.kind === "gift" ? "pending" : "auto";
    const drawId = uid();
    await env.DB.prepare(
      `INSERT INTO lottery_draws(id, user_id, family_id, prize_id, title, icon, kind, coins, status)
       VALUES(?,?,?,?,?,?,?,?,?)`
    ).bind(drawId, user.id, family.id, hit.id, hit.title, hit.icon, hit.kind, hit.coins, status).run();

    if (hit.kind === "coins" && hit.coins > 0) {
      await credit(env, user.id, hit.coins, "lottery_win", `抽奖中了「${hit.title}」`);
    }

    const u: any = await env.DB.prepare(`SELECT balance FROM users WHERE id=?`).bind(user.id).first();
    return json({
      ok: true,
      prize: { id: drawId, title: hit.title, icon: hit.icon, kind: hit.kind, coins: hit.coins, status },
      balance: u.balance,
      quota: await lotteryQuota(env, user.id, cfg),
    });
  } catch (e: any) {
    return apiError(e);
  }
};
