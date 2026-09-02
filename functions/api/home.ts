import { requireAuth, apiError, json } from "./_lib";

// 孩子端首页：任务、打卡状态、余额、目标、定期概览
export const onRequestGet = async (context: any) => {
  try {
    const { env, user, family } = await requireAuth(context);
    if (user.role !== "child") throw new Error("not child");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tasksRes: any = await env.DB.prepare(
      `SELECT * FROM tasks WHERE family_id=? AND active=1 AND (assignee IS NULL OR assignee=?) ORDER BY created_at DESC`
    ).bind(family.id, user.id).all();
    const tasks = (tasksRes.results as any[]).map((t) => ({ ...t, doneToday: false, pendingToday: false }));

    const compsRes: any = await env.DB.prepare(
      `SELECT * FROM completions WHERE child_id=? AND created_at>=? ORDER BY created_at DESC`
    ).bind(user.id, todayStart.toISOString()).all();
    const completionsToday = compsRes.results as any[];

    // 曾经完成过的任务集合（once 类）
    const everRes: any = await env.DB.prepare(
      `SELECT DISTINCT task_id FROM completions WHERE child_id=? AND status IN ('pending','approved')`
    ).bind(user.id).all();
    const everDone = new Set((everRes.results as any[]).map((r: any) => r.task_id));

    const taskById = new Map(tasks.map((t) => [t.id, t]));
    for (const c of completionsToday) {
      const t = taskById.get(c.task_id);
      if (!t) continue;
      if (c.status === "pending") t.pendingToday = true;
      else t.doneToday = true;
    }
    const visible = tasks.filter((t: any) => {
      if (t.kind === "once" && everDone.has(t.id)) return false;
      return true;
    });

    const goalsRes: any = await env.DB.prepare(
      `SELECT * FROM goals WHERE user_id=? ORDER BY created_at DESC`
    ).bind(user.id).all();
    const goals = (goalsRes.results as any[]).map((g) => ({
      ...g,
      progress: Math.min(1, g.saved / g.target),
    }));

    const depositsRes: any = await env.DB.prepare(
      `SELECT * FROM deposits WHERE user_id=? AND status='active' ORDER BY start_at DESC`
    ).bind(user.id).all();

    const pendingRes: any = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM redemptions WHERE child_id=? AND status='pending'`
    ).bind(user.id).first();

    return json({
      balance: user.balance,
      exchangeRate: family.exchange_rate,
      interest: { 7: family.interest_7, 14: family.interest_14, 30: family.interest_30 },
      tasks: visible,
      completionsToday: completionsToday.map((c) => {
        const t = taskById.get(c.task_id);
        return {
          id: c.id, taskId: c.task_id, icon: t?.icon || "⭐", title: t?.title || "任务",
          amount: c.amount, status: c.status, createdAt: c.created_at,
        };
      }),
      goals,
      deposits: depositsRes.results,
      pendingRedemptions: pendingRes.n,
    });
  } catch (e: any) {
    return apiError(e);
  }
};
