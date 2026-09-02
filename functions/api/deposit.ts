import { requireAuth, apiError, json, fail, debit, uid, rateForTerm } from "./_lib";

export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, body } = await requireAuth(context);
    if (user.role !== "child") return fail("只有小朋友才能存钱", 403);

    const amount = Math.floor(Number(body.amount) || 0);
    const termDays = Number(body.termDays) || 7;
    if (amount < 5) return fail("最少存 5 时币哦");
    if (![7, 14, 30].includes(termDays)) return fail("期限只能是 7 / 14 / 30 天");

    const rate = rateForTerm(termDays, family);
    const interest = Math.floor((amount * rate) / 100);

    await debit(env, user.id, amount, "deposit", `存入定期 ${termDays} 天`);

    const end = new Date(Date.now() + termDays * 86400_000);
    await env.DB.prepare(
      `INSERT INTO deposits(id, user_id, amount, term_days, rate, interest, status, end_at) VALUES(?,?,?,?,?,?,?,?)`
    ).bind(uid(), user.id, amount, termDays, rate, interest, "active", end.toISOString()).run();

    return json({ ok: true, interest });
  } catch (e: any) {
    return apiError(e);
  }
};
