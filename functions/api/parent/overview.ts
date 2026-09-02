import { requireAuth, apiError, json, settleDeposits } from "../_lib";

// 家长总览：孩子 + 待审批数量
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");

    const kidsRes: any = await env.DB.prepare(
      `SELECT id, name, avatar, balance, created_at FROM users WHERE family_id=? AND role='child' ORDER BY created_at`
    ).bind(family.id).all();
    const kids = kidsRes.results as any[];

    // 结算定期，保证余额准确
    for (const k of kids) await settleDeposits(env, k.id);

    const reRead: any = await env.DB.prepare(
      `SELECT id, name, avatar, balance FROM users WHERE family_id=? AND role='child' ORDER BY created_at`
    ).bind(family.id).all();

    const comps: any = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM completions WHERE status='pending' AND child_id IN (SELECT id FROM users WHERE family_id=? AND role='child')`
    ).bind(family.id).first();
    const reds: any = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM redemptions WHERE status='pending' AND family_id=?`
    ).bind(family.id).first();

    return json({
      code: family.code,
      kids: reRead.results,
      pending: {
        completions: comps.n,
        redemptions: reds.n,
        total: comps.n + reds.n,
      },
    });
  } catch (e: any) {
    return apiError(e);
  }
};
