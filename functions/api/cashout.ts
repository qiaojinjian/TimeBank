import { requireAuth, apiError, json, fail, debit, uid } from "./_lib";

// 时币 → 真实零花钱（家庭按比例兑换，家长线下给钱并审批）
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能兑换零花钱", 403);
    const rate = family.exchange_rate;
    const coins = Math.floor(Number(body.coins) || 0);
    if (coins < rate) return fail(`最少兑换 ${rate} 时币（1 元）`);
    const moneyFen = Math.floor((coins * 100) / rate);

    await debit(env, user.id, coins, "cashout", "兑换零花钱（待家长给钱）");

    await env.DB.prepare(
      `INSERT INTO redemptions(id, family_id, child_id, kind, coins, money_fen, status) VALUES(?,?,?,?,?,?,?)`
    ).bind(uid(), family.id, user.id, "cashout", coins, moneyFen, "pending").run();

    return json({ ok: true, coins, moneyFen });
  } catch (e: any) {
    return apiError(e);
  }
};
