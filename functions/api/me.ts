import { requireAuth, apiError, json } from "./_lib";

export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    const kids: any = await env.DB.prepare(
      `SELECT id, name, avatar, role, balance FROM users WHERE family_id=? AND role='child' ORDER BY created_at`
    ).bind(family.id).all();
    return json({
      user: {
        id: user.id, name: user.name, avatar: user.avatar, role: user.role, balance: user.balance,
        handle: user.handle || null,
      },
      family: {
        id: family.id,
        name: family.name,
        code: user.role === "parent" ? family.code : undefined,
        exchangeRate: family.exchange_rate,
        interest7: family.interest_7,
        interest14: family.interest_14,
        interest30: family.interest_30,
      },
      kids: kids.results,
    });
  } catch (e: any) {
    return apiError(e);
  }
};
