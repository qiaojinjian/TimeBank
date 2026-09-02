import { requireAuth, apiError, json, fail } from "../_lib";

export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");
    return json({
      family: {
        id: family.id,
        name: family.name,
        code: family.code,
        exchangeRate: family.exchange_rate,
        interest7: family.interest_7,
        interest14: family.interest_14,
        interest30: family.interest_30,
      },
    });
  } catch (e: any) {
    return apiError(e);
  }
};

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能修改设置", 403);

    const exchangeRate = Math.floor(Number(body.exchangeRate) || 10);
    const interest7 = Math.floor(Number(body.interest7) || 0);
    const interest14 = Math.floor(Number(body.interest14) || 0);
    const interest30 = Math.floor(Number(body.interest30) || 0);
    const name = String(body.name || family.name).trim().slice(0, 20);
    if (exchangeRate < 1 || exchangeRate > 10000) return fail("兑换比例请在 1~10000 之间");
    if ([interest7, interest14, interest30].some((n) => n < 0 || n > 100)) return fail("利率请在 0~100 之间");

    await env.DB.prepare(
      `UPDATE families SET exchange_rate=?, interest_7=?, interest_14=?, interest_30=?, name=? WHERE id=?`
    ).bind(exchangeRate, interest7, interest14, interest30, name, family.id).run();
    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
