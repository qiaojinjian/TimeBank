import { requireAuth, apiError, json, fail, credit, debit } from "../../../_lib";

// 家长手动调整孩子时币：amount>0 加币，amount<0 扣币
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长才能调整时币", 403);

    const childId = params.id;
    const child: any = await env.DB.prepare(
      `SELECT id, name FROM users WHERE id=? AND family_id=? AND role='child'`
    ).bind(childId, family.id).first();
    if (!child) return fail("没找到这个小朋友", 404);

    const amount = Math.floor(Number(body.amount));
    if (!Number.isFinite(amount) || amount === 0) return fail("请输入要调整的时币数量");
    if (Math.abs(amount) > 999) return fail("单次最多调整 999 时币");

    const note = String(body.note || "").trim().slice(0, 40) || "家长手动调整";
    if (amount > 0) {
      await credit(env, childId, amount, "parent_adjust", note);
    } else {
      await debit(env, childId, -amount, "parent_deduct", note);
    }

    const after: any = await env.DB.prepare(`SELECT balance FROM users WHERE id=?`).bind(childId).first();
    return json({ ok: true, balance: after.balance });
  } catch (e: any) {
    return apiError(e);
  }
};
