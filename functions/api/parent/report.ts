import { requireAuth, apiError, json } from "../_lib";

// 周报：近 7 天完成情况、存钱罐、流水汇总
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "parent") throw new Error("not parent");

    const weekAgo = new Date(Date.now() - 6 * 86400_000);
    weekAgo.setHours(0, 0, 0, 0);

    const kidsRes: any = await env.DB.prepare(
      `SELECT id, name, avatar FROM users WHERE family_id=? AND role='child' ORDER BY created_at`
    ).bind(family.id).all();
    const kids = kidsRes.results as any[];

    const stats = [];
    for (const k of kids) {
      const week: any = await env.DB.prepare(
        `SELECT COUNT(*) AS n, COALESCE(SUM(amount),0) AS coins
         FROM completions WHERE child_id=? AND status='approved' AND reviewed_at>=?`
      ).bind(k.id, weekAgo.toISOString()).all();
      const weekly: any = await env.DB.prepare(
        `SELECT date(created_at) AS d, COUNT(*) AS n FROM completions
         WHERE child_id=? AND status='approved' AND created_at>=?
         GROUP BY date(created_at)`
      ).bind(k.id, weekAgo.toISOString()).all();
      const goals: any = await env.DB.prepare(
        `SELECT id, title, icon, target, saved, status FROM goals WHERE user_id=? AND status='active' ORDER BY created_at DESC`
      ).bind(k.id).all();
      stats.push({
        id: k.id,
        name: k.name,
        avatar: k.avatar,
        weekCompletions: week.results[0]?.n || 0,
        weekCoins: week.results[0]?.coins || 0,
        daily: weekly.results,
        goals: goals.results,
      });
    }

    const totalKids = kids.length;
    const allCoins: any = await env.DB.prepare(
      `SELECT COALESCE(SUM(balance),0) AS total FROM users WHERE family_id=? AND role='child'`
    ).bind(family.id).first();

    return json({ kids: stats, totalKids, totalCoins: allCoins.total });
  } catch (e: any) {
    return apiError(e);
  }
};
