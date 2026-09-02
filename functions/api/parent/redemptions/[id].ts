import { requireAuth, apiError, json, fail, credit } from "../../_lib";

// 审批兑换/零花钱：approve（家长线下兑现）/ reject（退回时币）
export const onRequestPost = async (context: any) => {
  try {
    const { env, user, family, params, body } = await requireAuth(context);
    if (user.role !== "parent") return fail("只有家长能审批", 403);
    const action = body.action === "reject" ? "reject" : "approve";
    const note = String(body.note || "").trim().slice(0, 60) || null;

    const red: any = await env.DB.prepare(
      `SELECT * FROM redemptions WHERE id=? AND family_id=?`
    ).bind(params.id, family.id).first();
    if (!red) return fail("这条申请不存在", 404);
    if (red.status !== "pending") return fail("这条已经处理过啦");

    if (action === "reject") {
      // 退款
      await credit(env, red.child_id, red.coins, "refund", red.kind === "cashout" ? "零花钱兑换被退回" : "奖励兑换被退回");
    }
    await env.DB.prepare(
      `UPDATE redemptions SET status=?, reviewed_at=?, note=? WHERE id=?`
    ).bind(action === "approve" ? "approved" : "rejected", new Date().toISOString(), note, red.id).run();

    return json({ ok: true });
  } catch (e: any) {
    return apiError(e);
  }
};
