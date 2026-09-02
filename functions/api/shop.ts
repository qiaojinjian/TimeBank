import { requireAuth, apiError, json } from "./_lib";

// 奖励商店（孩子可见的已上架奖励）
export const onRequestGet = async (context: any) => {
  try {
    const { env, family } = await requireAuth(context);
    const res: any = await env.DB.prepare(
      `SELECT id, title, icon, price FROM rewards WHERE family_id=? AND active=1 ORDER BY price ASC`
    ).bind(family.id).all();
    return json({ rewards: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};
