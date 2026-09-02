import { requireAuth, apiError, json } from "./_lib";

export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "child") throw new Error("not child");

    const depositsRes: any = await env.DB.prepare(
      `SELECT * FROM deposits WHERE user_id=? ORDER BY start_at DESC`
    ).bind(user.id).all();
    const goalsRes: any = await env.DB.prepare(
      `SELECT * FROM goals WHERE user_id=? ORDER BY created_at DESC`
    ).bind(user.id).all();
    const goals = (goalsRes.results as any[]).map((g) => ({
      ...g, progress: g.target > 0 ? Math.min(1, g.saved / g.target) : 0,
    }));

    return json({
      balance: user.balance,
      exchangeRate: family.exchange_rate,
      interest: { 7: family.interest_7, 14: family.interest_14, 30: family.interest_30 },
      deposits: depositsRes.results,
      goals,
    });
  } catch (e: any) {
    return apiError(e);
  }
};
