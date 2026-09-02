import { requireAuth, apiError, json } from "../_lib";

// 兑换/零花钱审批列表
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");
    const url = new URL(context.request.url);
    const status = url.searchParams.get("status") || "pending";

    const res: any = await env.DB.prepare(
      `SELECT r.id, r.kind, r.coins, r.money_fen, r.status, r.created_at, r.note,
              rw.title AS reward_title, rw.icon AS reward_icon,
              u.name AS child_name, u.avatar AS child_avatar
       FROM redemptions r
       LEFT JOIN rewards rw ON rw.id = r.reward_id
       JOIN users u ON u.id = r.child_id
       WHERE r.family_id=? AND r.status=?
       ORDER BY r.created_at DESC`
    ).bind(family.id, status).all();

    return json({ redemptions: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};
