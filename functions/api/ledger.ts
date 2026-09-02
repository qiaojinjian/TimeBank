import { requireAuth, apiError, json } from "./_lib";

// 我的账本（流水）
export const onRequestGet = async (context: any) => {
  try {
    const { env, user } = await requireAuth(context);
    const res: any = await env.DB.prepare(
      `SELECT * FROM ledger WHERE user_id=? ORDER BY created_at DESC, id DESC LIMIT 200`
    ).bind(user.id).all();
    return json({ ledger: res.results });
  } catch (e: any) {
    return apiError(e);
  }
};
